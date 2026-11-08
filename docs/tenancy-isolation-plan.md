# VAHD — Organization-Level Tenancy & Data Isolation Plan

**Decision:** canonical tenant = **branch** (`vahdBranch.id`). HO is a rollup of branches.
**Enforcement:** DB-scoped session (SQLAlchemy auto-injection), with a super-admin bypass.
**Status:** Plan only — no code changes yet.

---

## 1. Problem statement

VAHD has **no single authoritative tenant key**. Every entity carries a hand-mixed
`branch_id` / `owner_id` / `ho_id` (+ free-text `vahd_branch`, `primary_vahd_location`),
and isolation is re-derived **per endpoint** — 343 hand-rolled filter references across
`src/api/v1/*.py`. One missed endpoint = cross-org data leak. Additionally:

- **Tables with zero tenancy column:** Inventory (Product, Brand, Category, UoM,
  StockMovement), Procurement (request/quotation/PO/GRN/bill/payment/debit/credit notes),
  POS (PosTransaction, PosSession), Membership, Payroll, Biometric, WhatsApp/CRM,
  Notifications, and all HRMS *master* data (Department, Designation, Team, LeaveType,
  GeofenceScheme, PayslipTemplate, CommissionSlabPlan, PayGrade, WorkCalendarPolicy,
  CompanyHoliday, RecruitmentJob, JobApplicant).
- **Global `unique=True` constraints** that will `IntegrityError` the moment two orgs
  use the same value (e.g. two orgs both create SKU `ABC` or invoice `INV-001`):
  `Employee.code`, `Department.name/code`, `LeaveType.name/code`, `GeofenceScheme.name`,
  `ShiftTemplate.code`, `Course.name`, `Product.sku`/`category_code`, `PosTransaction.invoice_number`,
  all procurement `*_number`, `Setting/MasterData.name`, `FeatureControl.feature_name`.
- **Frontend drift:** `tenant-context.tsx` picks company/branch from localStorage/mocks;
  the API ignores it and re-derives scope from the JWT user. The "switch org" UI can
  disagree with what the DB actually returns.

## 2. Canonical model

| Concept | Value | Notes |
|---|---|---|
| **`tenant_id`** | `vahdBranch.id` (the org/institution record) | The ONE isolation key. Indexed on every entity table. |
| `branch_id` | keep | convenience/legacy; **never** used for isolation. |
| `ho_id` | keep, but give an FK | rollup grouping of branches. Bare String today — add FK → `branches.id`. |
| `owner_id` | keep | user who owns the branch; used for ownership, not row isolation. |
| Platform operator | `is_platform_admin = True` | bypasses tenant scoping (sees everything). |

Every entity row gets `tenant_id` = the `vahdBranch.id` it was created under. HO pages
query "all `tenant_id`s under my `ho_id`"; branch pages query their single `tenant_id`.

## 3. Phases

### Phase 1 — Schema + composite uniqueness + backfill (no behavior change yet)
1. **Add `tenant_id = Column(String, nullable=True, index=True)`** to every model listed in
   §1 that lacks a tenancy column, and to `Membership`, `Payroll`, `Biometric*`,
   `WhatsApp*`/CRM, `Notification*`, POS.
2. **Convert global `unique=True` → composite unique on `(tenant_id, col)`** for the
   business-number columns in §1. In SQLAlchemy: drop the column-level `unique=True` and
   add `__table_args__ = (UniqueConstraint("tenant_id", "sku"),)`.
   - `User.email`, `super_admin.*` (platform-level, not tenant-scoped) stay globally unique.
   - `Employee.code` etc. become unique *per tenant*.
3. **Backfill** (run once inside `run_database_migrations()` in [db_migrate.py:186](../backend/src/database/db_migrate.py#L186)):
   - For each row lacking `tenant_id`: derive it from existing `branch_id` / `ho_id` /
     `owner_id` / `vahd_branch` (resolve free-text `vahd_branch` name → `vahdBranch.id`).
   - **Master-data tables with no owner (Department, LeaveType, …):** they are shared
     seeds. Two options — decide per table:
     (a) mark a platform seed value `tenant_id = NULL` = "shared/system", or
     (b) copy per tenant on demand. Default to **(a)** to avoid duplicating leave types
     across orgs; make them tenant-overridable later.
4. The auto column-creation loop at [db_migrate.py:238-256](../backend/src/database/db_migrate.py#L238-L256)
   will create the new `tenant_id` columns automatically — good. Add the composite-unique
   `ALTER TABLE ... ADD CONSTRAINT` and the backfill UPDATEs as new steps after it.
5. **Do not enforce yet.** This phase is pure schema; the app behaves exactly as today.

### Phase 2 — DB-scoped session enforcement
Add a `TenantSession` (a `Session` subclass + `SessionEvents`/`do_orm_execute` listener,
or a SQLAlchemy 2.0 "scoped session" pattern) that:
- Reads `current_tenant_id` (from request context / JWT user's branch) into
  `contextvars` (thread-safe for FastAPI workers).
- On **SELECT** for any tenant-scoped model, auto-appends `WHERE tenant_id = :tid`
  (or `IN (…)` when an HO user is viewing all branches under their `ho_id`).
- On **INSERT/UPDATE/DELETE**, sets/verifies `tenant_id`.
- **Bypass** when the acting user `is_platform_admin` OR the model is on an explicit
  "system/shared" allowlist (e.g. platform seed leave types, `users`, `SaaSPlan`).

Centralize: keep the existing `get_current_user` in [deps.py](../backend/src/api/deps.py),
add `require_tenant()` / `set_current_tenant(user)` and wire it into the FastAPI
request lifecycle so the 343 hand-rolled filters become redundant.

### Phase 3 — Remove the 343 ad-hoc filters + align frontend
- Strip now-redundant `branch_id/ho_id/owner_id` filtering from endpoints (they become
  pass-through metadata). Keep the columns; just stop using them for isolation.
- **Frontend:** make [tenant-context.tsx](../frontend/src/contexts/tenant-context.tsx)
  the *display* source of truth but have the API client send the selected
  `tenant_id`/`ho_id` in the request so the backend scopes to it; reconcile with the JWT
  user's permitted tenants (a user can only select a tenant they belong to).
- Super-admin console pages (`superadmin/*`) stay unscoped.

### Phase 4 — Harden + verify
- DB-level check: composite indexes on `(tenant_id, …)` hot query paths.
- Regression test: per-tenant create/collision (org A creates SKU `ABC`, org B creates
  SKU `ABC` → must both succeed); cross-tenant read (org A token must not see org B rows).
- Data-integrity audit query: count rows where `tenant_id IS NULL` and reconcile.
- Fix the HO-deletion / "no branch records" class of bugs once `ho_id` is a real FK.

## 4. Rollback & risk
- Phase 1 is non-breaking (adds nullable column + widens uniqueness); safe to run anytime,
  backfill is idempotent.
- Phase 2 is the risky one — isolate it: gate the auto-injection behind a config flag
  (`TENANT_ENFORCE=true`) so it can be toggled off if a false positive surfaces.
- Composite-unique changes can fail on *existing* duplicate data in a single-tenant DB;
  run the backfill **before** adding the constraint, and the migration should
  `report` (not crash) on violations.

## 5. Definition of done
- [ ] `tenant_id` present + indexed on all entity tables; composite-unique in place.
- [ ] Backfill complete; `tenant_id IS NULL` only on system/shared seed rows.
- [ ] DB-scoped session enforces isolation; platform-admin bypass verified.
- [ ] All 343 ad-hoc filters removed or marked non-enforcing.
- [ ] Frontend tenant switcher aligned to API scoping.
- [ ] Test suite: two-tenant create + collision + cross-tenant-read isolation passing.
