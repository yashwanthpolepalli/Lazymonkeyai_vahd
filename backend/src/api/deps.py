from typing import Optional, Generator, Dict, List, Tuple
import time
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import or_
from sqlalchemy.orm import Session

from src.database.session import SessionLocal, get_db
from src.database.tenant_session import (
    set_tenant_scope,
    set_tenant_scope_deny,
    run_in_resolving,
    get_tenant_scope,
)
from src.models.user import User
from src.utils.security import verify_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

# Short in-memory cache to prevent redundant branch queries during rapid parallel requests
_BRANCH_CACHE: Dict[str, Tuple[float, list]] = {}

def resolve_tenant_scope(user: Optional[User], db: Session) -> Optional[list]:
    """
    Phase-2 central scope resolver — returns the list of tenant_ids (branch
    ids) this user may access, or None to bypass filtering entirely.

      * Platform admin / SUPER_ADMIN            → None (sees everything)
      * HEAD_OFFICE / HO                        → all active branch ids under
                                                  their HO context
      * OWNER / MANAGER / employee / STAFF /
        student                                 → their own branch tenant
        (falls back to branches under their HO when no branch is set)
      * no user                                 → None (bypass; the endpoint
                                                  auth layer still guards it)
    """
    if user is None:
        return None

    role = (getattr(user, "role", None) or "").strip().upper()
    if getattr(user, "is_platform_admin", False) or role == "SUPER_ADMIN":
        return None

    from src.models.settings import Branch

    def branch_ids_under(ho_ctx: str, uid: str) -> list:
        now = time.time()
        cache_key = f"{ho_ctx}:{uid}"
        if cache_key in _BRANCH_CACHE:
            expiry, ids = _BRANCH_CACHE[cache_key]
            if now < expiry:
                return ids

        rows = db.query(Branch).filter(
            or_(Branch.ho_id == ho_ctx, Branch.owner_id == uid),
            Branch.is_active == True,
        ).all()
        res = [b.id for b in rows if b.id]
        _BRANCH_CACHE[cache_key] = (now + 30.0, res)
        return res

    # HO role: scope = every active branch under their HO (canonical tenant = branch id)
    if role in ("HEAD_OFFICE", "HO"):
        ho_ctx = getattr(user, "ho_id", None) or user.id
        ids = run_in_resolving(lambda: branch_ids_under(ho_ctx, user.id))
        # an HO with no branches yet should not lock themselves out of
        # creating data — fall back to their user id as a pseudo-tenant
        return ids or [user.id]

    # Branch-level roles: their own branch is the tenant
    if getattr(user, "branch_id", None):
        return [user.branch_id]

    # Owner / HO-affiliated user without a branch → use their HO's branches
    ho_ctx = getattr(user, "ho_id", None)
    if ho_ctx:
        ids = run_in_resolving(lambda: branch_ids_under(ho_ctx, user.id))
        if ids:
            return ids
    # Last resort: the user's own id as a pseudo-tenant so their data stays
    # writable & visible to themselves (never leaks to other orgs)
    return [user.id]


def _expand_tenant(db: Session, tenant_id: str) -> List[str]:
    """Expand a ribbon-selected tenant id into the set of tenant ids to scope to.

    People/HR tables are stamped with the *branch* id as their canonical tenant.
    The ribbon may hold:
      * a branch id (HO / owner selectors)      -> scope is just that branch
      * an HO / owner id (super-admin selector) -> expand to every active branch
        under that HO / owner, plus the id itself (rows may be stamped to it)

    Using the expanded set, not a bare HO id, is what stops the super-admin
    "switch organization" from narrowing to zero / the wrong org.
    """
    from src.models.settings import Branch

    now = time.time()
    cache_key = f"narrow:{tenant_id}"
    if cache_key in _BRANCH_CACHE:
        expiry, ids = _BRANCH_CACHE[cache_key]
        if now < expiry:
            return ids
    rows = db.query(Branch).filter(
        or_(Branch.ho_id == tenant_id, Branch.owner_id == tenant_id),
        Branch.is_active == True,
    ).all()
    ids = [b.id for b in rows if b.id]
    ids.insert(0, tenant_id)  # keep the selected id itself (branch id or HO-stamped rows)
    # Settings created at "All Head Offices" level are stamped with the HO
    # user id / branch owner id. When the ribbon selects a SPECIFIC
    # organization, that branch's own ho_id/owner_id (and its siblings')
    # must stay in the read scope, or the HO-created settings disappear
    # from that org's Settings tab.
    selected = None
    if db is not None:
        selected = db.query(Branch).filter(Branch.id == tenant_id).first()
    for b in ([selected] if selected else []) + rows:
        for hid in (getattr(b, "ho_id", None), getattr(b, "owner_id", None)):
            if hid and hid not in ids:
                ids.append(hid)
    _BRANCH_CACHE[cache_key] = (now + 30.0, ids)
    return ids


def _finish(user: Optional[User], db: Session, request: Optional[Request] = None) -> Optional[User]:
    """Set the request's tenant scope, then hand back the resolved user.

    Honors an optional `X-Tenant-Id` request header (used by the HO
    "Switch View" / organization selector) to NARROW the user's scope to a
    single organization. The requested tenant is always intersected with the
    user's already-resolved scope, so a client can never WIDEN their own
    access — a request outside the allowed scope is ignored.
    """
    try:
        scope = resolve_tenant_scope(user, db)
        # Platform admin / unscoped (scope is None) → honor an explicit tenant
        # so a super-admin can view a specific org; tenant-scoped users can
        # only narrow within what they already have.
        if request is not None:
            req_tenant = request.headers.get("X-Tenant-Id") or request.query_params.get("x_tenant_id")
            if req_tenant and req_tenant.lower() not in ("all", ""):
                expanded = _expand_tenant(db, req_tenant)
                if scope is None:
                    scope = expanded
                else:
                    kept = [t for t in scope if t in expanded]
                    if kept:
                        scope = kept
                    # else: out-of-scope selection — keep the base scope
        set_tenant_scope(scope)
    except Exception:  # never break auth because scoping failed to resolve
        set_tenant_scope(None)
    return user


def _authenticate(
    request: Request,
    db: Session,
    token: Optional[str],
    use_fallback_user: bool = True,
) -> Optional[User]:
    """Resolve the acting user from the request WITHOUT raising and WITHOUT
    applying a tenant scope. Pure auth. Returns None if unauthenticated.

    Kept separate from get_current_user so the global scope dependency can
    resolve the user and set the tenant scope on *every* request, not just
    the endpoints that happen to declare get_current_user.
    """
    auth_token = token or request.query_params.get("token")
    if not auth_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            auth_token = auth_header.split(" ")[1]

    if not auth_token:
        if use_fallback_user:
            return db.query(User).filter(User.is_active == True).first()
        return None

    user = None
    # 1. If JWT token provided, verify signature
    payload = verify_token(auth_token)
    if payload:
        user_id = payload.get("sub")
        candidate = db.query(User).filter(User.id == user_id).first()
        if candidate and candidate.is_active:
            user = candidate

    # 2. Pseudo-token "token_{user_id}_{timestamp}"
    if user is None and auth_token.startswith("token_"):
        parts = auth_token.split("_")
        if len(parts) >= 2:
            candidate = db.query(User).filter(
                User.id == parts[1], User.is_active == True
            ).first()
            if candidate:
                user = candidate

    # 3. Direct user ID or email
    if user is None:
        candidate = db.query(User).filter(
            (User.id == auth_token) | (User.email == auth_token),
            User.is_active == True
        ).first()
        if candidate:
            user = candidate

    # 4. Fallback (exports / media): first active admin or owner — only when the
    #    caller explicitly wants it (get_current_user does; global scope does not).
    if user is None and use_fallback_user:
        user = db.query(User).filter(User.is_active == True).first()

    return user


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[User]:
    user = _authenticate(request, db, token, use_fallback_user=True)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _finish(user, db, request)


# Routes that legitimately run without a user token: auth (login/signup) and
# machine-to-machine webhooks. These bypass tenant filtering (scope=None).
# The API is mounted under both /api/v1 and /api, so match both.
_SYSTEM_ROUTE_PREFIXES = (
    "auth/",
    "biometrics/essl-webhook",
    "whatsapp-automation/webhook",
)


def _is_system_route(path: str) -> bool:
    for mount in ("/api/v1/", "/api/"):
        if path.startswith(mount):
            rel = path[len(mount):]
            return any(rel == p or rel.startswith(p) for p in _SYSTEM_ROUTE_PREFIXES)
    return False


async def apply_tenant_scope(
    request: Request,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
) -> None:
    """GLOBAL Phase-2 scope dependency.

    Attached to the /api/v1 router so tenant isolation is enforced on EVERY
    request regardless of whether an individual endpoint declares
    get_current_user:

      * valid token   → resolve the user, set the request's tenant scope
                        (narrowing X-Tenant-Id honored)
      * anonymous     → DENY-BY-DEFAULT: active-table reads return nothing
                        and writes are refused (403), EXCEPT whitelisted
                        system/M2M routes which bypass filtering
      * system routes (auth + webhooks) → bypass (scope=None)

    MUST be async: a sync dependency runs in a threadpool worker and its
    contextvar write would not propagate to the (sync) endpoint. An async
    dependency runs in the ASGI task, so the scope it sets is visible to every
    endpoint on the request.
    """
    user = _authenticate(request, db, token, use_fallback_user=False)
    if user is not None:
        _finish(user, db, request)
        return

    # Anonymous request
    if _is_system_route(request.url.path):
        set_tenant_scope(None)  # auth + M2M webhooks run unscoped
    else:
        set_tenant_scope_deny()  # unauthenticated → deny by default

def current_tenant_scope() -> Optional[List[str]]:
    """Return the active request's tenant scope (list of branch/tenant ids),
    or None when unscoped (platform admin / system job / anonymous-non-scope).

    For use by HO-level endpoints: when the ribbon narrows to a single
    organization the scope is exactly [that branch id] — use it to narrow
    branch queries that would otherwise aggregate every org under the HO.
    """
    return get_tenant_scope()


def require_role(allowed_roles: list):
    def role_checker(current_user: Optional[User] = Depends(get_current_user)):
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
            )
        if current_user.role not in allowed_roles and not current_user.is_platform_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted",
            )
        return current_user
    return role_checker
