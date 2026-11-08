"""
VAHD Tenancy Enforcement Layer (Phase 2)
=========================================
TenantSession — a SQLAlchemy Session that enforces organization-level
data isolation automatically at the ORM layer, so no endpoint can
accidentally read or write another organization's rows.

Design
------
* Registry: every table that owns a `tenant_id` column is auto-detected
  from `Base.metadata` at import time — new models are covered for free.
* READS: any ORM SELECT that touches a registered table gets
  `WHERE (t.tenant_id IN :scope OR t.tenant_id IS NULL)` appended
  automatically. NULL rows remain visible during the transition period
  (legacy data without a stamped tenant).
* WRITES: instances flushed through the session are stamped with the
  current tenant when `tenant_id` is not yet set.
* BYPASS: platform admins (super admin) run with `scope = None` → no
  filtering at all. `users` and `branches` are exempt tables (they ARE
  the scope source, not scoped data).
* GATE: everything is behind `TENANT_ENFORCE` (settings / env). When off,
  the session behaves exactly like a plain Session.

Scope is carried in contextvars so it is correct per-request (async +
threaded uvicorn) and is set once per request by `set_tenant_scope()`
(wired into api/deps.py `get_current_user`).
"""
from __future__ import annotations

import contextvars
import logging
from typing import List, Optional, Set

from sqlalchemy import event, and_, or_
from sqlalchemy.orm import Session
from sqlalchemy.sql import Select

logger = logging.getLogger("VAHD_TENANT")

# ── Tables that must NEVER be filtered (they hold the scope itself) ─────
EXEMPT_TABLES = frozenset({"users", "branches", "alembic_version"})

# ── Per-request tenant scope (contextvars → thread/async safe) ──────────
_tenant_scope: contextvars.ContextVar[Optional[List[str]]] = contextvars.ContextVar(
    "vahd_tenant_scope", default=None
)
# True while the scope resolver itself queries users/branches, so the
# auto-filter never recurses or blocks its own resolution queries.
_resolving: contextvars.ContextVar[bool] = contextvars.ContextVar(
    "vahd_tenant_resolving", default=False
)

_SENTINEL = object()

# Sentinel: unauthenticated requests → reads see NOTHING, writes are refused.
DENY_ALL: frozenset = frozenset()


class TenantScopeDenied(Exception):
    """Raised when a write is attempted with no tenant scope (unauthenticated)."""


def set_tenant_scope_deny() -> None:
    """Deny-by-default: active reads return empty, active writes are refused."""
    _tenant_scope.set(DENY_ALL)


def set_tenant_scope(tenant_ids: Optional[List[str]]) -> None:
    """Set the tenant scope for the current request/task.

    Pass None (or an empty list) for platform admins / unscoped system
    jobs — the session will not filter anything.
    """
    if tenant_ids:
        seen: Set[str] = set()
        clean = [t for t in tenant_ids if t and not (t in seen or seen.add(t))]
        _tenant_scope.set(clean if clean else None)
    else:
        _tenant_scope.set(None)


def get_tenant_scope() -> Optional[List[str]]:
    return _tenant_scope.get()


def tenant_enforcement_enabled() -> bool:
    try:
        from src.config.settings import settings
        val = getattr(settings, "TENANT_ENFORCE", True)
        if isinstance(val, bool):
            return val
        return str(val).lower() in ("1", "true", "yes", "on")
    except Exception:
        return True


# ── Registry: tables that own a tenant_id column ────────────────────────
_TENANT_TABLE_NAMES: Set[str] = set()
_REGISTRY_LOADED = False


def load_tenant_registry() -> None:
    """Introspect Base.metadata and register every table with tenant_id."""
    global _REGISTRY_LOADED
    import src.models  # noqa: F401  (ensures Base.metadata is fully populated)
    from src.database.base import Base

    for table in Base.metadata.tables.values():
        if "tenant_id" in table.columns and table.name not in EXEMPT_TABLES:
            _TENANT_TABLE_NAMES.add(table.name)
    _REGISTRY_LOADED = True


def tenant_tables() -> Set[str]:
    if not _REGISTRY_LOADED:
        load_tenant_registry()
    return _TENANT_TABLE_NAMES


def _involved_tenant_tables(stmt):
    """Return tenant-scoped Table objects that appear in this statement."""
    load_tenant_registry()
    names = tenant_tables()
    tables = []
    seen: Set[str] = set()
    from src.database.base import Base

    def consider(fc):
        name = getattr(fc, "name", None)
        if name in names and name not in seen:
            seen.add(name)
            tbl = Base.metadata.tables.get(name)
            if tbl is not None:
                tables.append(tbl)

    for fc in (getattr(stmt, "froms", None) or []):
        consider(fc)
    for fc in (getattr(stmt, "_extra_froms", None) or []):
        consider(fc)
    return tables


class TenantSession(Session):
    """Session that auto-enforces tenant isolation on tenant-scoped tables."""

    # stamping on add()
    def add(self, instance, *_args, **_kwargs) -> None:  # type: ignore[override]
        scope = get_tenant_scope()
        if scope and scope is not DENY_ALL and not _resolving.get():
            table_name = getattr(
                getattr(type(instance), "__table__", None), "name", None
            )
            # tenant_tables() lazily loads the registry so INSERT-before-any-
            # SELECT (fresh worker) is still stamped correctly.
            if table_name in tenant_tables() and getattr(instance, "tenant_id", _SENTINEL) is None:
                try:
                    instance.tenant_id = scope[0]
                except Exception:  # pragma: no cover - never fatal
                    pass
        super().add(instance)


def _before_flush(session, flush_context, instances) -> None:
    """Stamp tenant_id on any flushed instance that doesn't have one yet."""
    scope = get_tenant_scope()
    if _resolving.get():
        return
    if scope is DENY_ALL:
        # Unauthenticated write attempt → refuse (403 handled in main.py).
        raise TenantScopeDenied(
            "Authentication required: unauthenticated requests cannot modify data"
        )
    if not scope or not instances:
        return
    tables = tenant_tables()  # lazily-load registry so early inserts are covered
    for obj in instances:
        table_name = getattr(getattr(type(obj), "__table__", None), "name", None)
        if table_name in tables and getattr(obj, "tenant_id", _SENTINEL) is None:
            obj.tenant_id = scope[0]


def _do_orm_execute(orm_exec_state) -> None:
    """Session 'do_orm_execute' event — auto-filter ORM SELECTs."""
    if not tenant_enforcement_enabled():
        return
    if _resolving.get():
        return
    stmt = orm_exec_state.statement
    scope = get_tenant_scope()
    if scope is None:  # explicit bypass (platform admin / system job)
        return

    involved = _involved_tenant_tables(stmt)

    if scope is DENY_ALL:
        # Unauthenticated request → active-table reads see NOTHING (deny by
        # default). Statements that only touch exempt tables (users,
        # branches) are left alone so /auth/login and reference reads work.
        if isinstance(stmt, Select) and involved:
            from sqlalchemy import false as _false
            orm_exec_state.statement = stmt.where(_false())
        return

    if not isinstance(stmt, Select):
        return  # writes are covered by before_flush stamping

    if not involved:
        return

    clause = and_(
        *[or_(t.c.tenant_id.in_(scope), t.c.tenant_id.is_(None)) for t in involved]
    )
    orm_exec_state.statement = stmt.where(clause)


# ── Event wiring (installed once at import) ─────────────────────────────
event.listen(TenantSession, "do_orm_execute", _do_orm_execute)
event.listen(TenantSession, "before_flush", _before_flush)


# ── Helpers used by api/deps.py ──────────────────────────────────────────
def scope_resolver() -> bool:
    return _resolving.get()


def run_in_resolving(fn):
    """Run fn with the resolver flag set so its internal user/branch
    lookups are not filtered by the tenant scope."""
    token = _resolving.set(True)
    try:
        return fn()
    finally:
        _resolving.reset(token)
