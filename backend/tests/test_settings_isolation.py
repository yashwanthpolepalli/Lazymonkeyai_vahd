"""
Settings isolation & Head Office relation tests.

Covers the org-scoping contracts added for the Settings tab:
  * _expand_tenant includes a branch's ho_id (HO-level settings stay visible
    when a specific branch under that HO is selected in the ribbon)
  * master-data reads are scoped: org + HO + global rows visible, other-org
    rows hidden
  * copy-on-write updates: a scoped update of a global row creates an
    org-owned copy; the global row stays untouched
  * scoped deletes of global rows are refused with a 409
  * employee creation is gated: designation/department/role must exist in
    the requesting org's configured settings (unscoped super-admin skips)

Runs against in-memory SQLite — no live database required.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401  (populate Base.metadata)
from src.database.base import Base
from src.database.tenant_session import TenantSession, set_tenant_scope
from src.models.settings import Branch as vahdBranch, MasterData
from src.models.hrms import Designation
from src.api.deps import _expand_tenant
import src.api.deps as _deps
from src.services.settings_service import SettingsService
from src.services.hrms_service import HrmsService
from fastapi import HTTPException

_engine = create_engine("sqlite://")
_Maker = sessionmaker(bind=_engine, class_=TenantSession)


def _make_db() -> TenantSession:
    db = _Maker()
    return db


class SettingsIsolationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(_engine)
        db = _make_db()
        # One head-office user, one branch under it.
        ho = vahdBranch(id="ho_user_x", branch_name="Vizag admin", ho_id=None, is_active=True)
        br = vahdBranch(
            id="branch_a", branch_name="Branch A", ho_id="ho_user_x",
            owner_id="ho_user_x", is_active=True,
        )
        br_b = vahdBranch(
            id="branch_b", branch_name="Branch B", ho_id="ho_user_x",
            is_active=True,
        )
        db.add_all([ho, br, br_b])
        # Master data: global role, HO-owned role, org-A role, org-B role
        db.add_all([
            MasterData(id="md_global", category="roles", name="GlobalRole", tenant_id=None),
            MasterData(id="md_ho", category="roles", name="HoRole", tenant_id="ho_user_x"),
            MasterData(id="md_a", category="roles", name="OrgARole", tenant_id="branch_a"),
            MasterData(id="md_b", category="roles", name="OrgBRole", tenant_id="branch_b"),
            MasterData(id="md_designer", category="designations", name="Designer", tenant_id=None),
            Designation(id="desg_manager", title="Manager", department="General", tenant_id=None),
        ])
        db.commit()
        db.close()

    def setUp(self):
        set_tenant_scope(None)
        _deps._BRANCH_CACHE.clear()

    def tearDown(self):
        set_tenant_scope(None)

    # ------------------------------------------------------------------
    # 1. _expand_tenant includes the branch's HO user id
    def test_expand_tenant_includes_branch_ho_id(self):
        db = _make_db()
        try:
            _deps._BRANCH_CACHE.clear()
            ids = _expand_tenant(db, "branch_a")
            self.assertIn("branch_a", ids)
            self.assertIn("ho_user_x", ids)  # HO-level settings must stay visible
        finally:
            db.close()

    # ------------------------------------------------------------------
    # 2. Scoped master-data reads: org + HO + global visible, other org hidden
    def test_master_data_scoped_visibility(self):
        db = _make_db()
        try:
            _deps._BRANCH_CACHE.clear()
            scope = _expand_tenant(db, "branch_a")
            set_tenant_scope(scope)
            items = SettingsService.get_master_data(db, category="roles")
            names = {i["name"] for i in items}
            self.assertIn("GlobalRole", names)   # shared platform row
            self.assertIn("HoRole", names)       # stamped under the branch's HO
            self.assertIn("OrgARole", names)     # the org's own row
            self.assertNotIn("OrgBRole", names)  # another org's row must not leak
        finally:
            db.close()

    # ------------------------------------------------------------------
    # 3. Copy-on-write: scoped update of a global row -> org copy, global intact
    def test_copy_on_write_update(self):
        db = _make_db()
        try:
            set_tenant_scope(["branch_a"])
            out = SettingsService.update_master_data_item(
                db, "roles", "md_global", {"name": "GlobalRole", "description": "edited by org A"}
            )
            db.commit()
            self.assertEqual(out.get("tenant_id"), "branch_a")  # returned the ORG copy
            # Global row unchanged
            g = db.query(MasterData).filter(MasterData.id == "md_global").one()
            self.assertIsNone(g.tenant_id)
            self.assertEqual(g.description, None)  # never mutated in place
            # Org copy exists
            copy_rows = db.query(MasterData).filter(
                MasterData.tenant_id == "branch_a",
                MasterData.name == "GlobalRole",
            ).all()
            self.assertEqual(len(copy_rows), 1)
        finally:
            db.close()

    # ------------------------------------------------------------------
    # 4. Scoped delete of a global row -> 409, row survives
    def test_scoped_delete_of_global_row_refused(self):
        db = _make_db()
        try:
            set_tenant_scope(["branch_a"])
            with self.assertRaises(HTTPException) as ctx:
                SettingsService.delete_master_data_item(db, "roles", "md_global")
            self.assertEqual(ctx.exception.status_code, 409)
            db.commit()
            self.assertTrue(
                db.query(MasterData).filter(MasterData.id == "md_global").first() is not None,
                "global row must survive a scoped delete attempt",
            )
        finally:
            db.close()

    # ------------------------------------------------------------------
    # 5. Employee creation is gated on the org's configured designations
    def test_employee_gate_rejects_unconfigured_designation(self):
        db = _make_db()
        try:
            set_tenant_scope(["branch_a"])
            with self.assertRaises(ValueError) as ctx:
                HrmsService.create_employee(db, {
                    "full_name": "Gate Reject",
                    "email": "gate.reject@test.local",
                    "designation": "GhostDesignation",  # not configured anywhere visible
                })
            self.assertIn("not found in database", str(ctx.exception).lower()
                          or str(ctx.exception))
        finally:
            db.close()

    def test_employee_gate_allows_configured_designation(self):
        db = _make_db()
        try:
            set_tenant_scope(["branch_a"])
            # "Manager" exists as a global designation -> must pass the settings
            # gate. create_employee may still raise for unrelated required
            # fields under bare SQLite (no users row etc.) — the point is that
            # it must NOT raise the gate / settings "not found" errors.
            try:
                HrmsService.create_employee(db, {
                    "full_name": "Gate Pass",
                    "email": "gate.pass@test.local",
                    "designation": "Manager",
                })
            except ValueError as ve:
                msg = str(ve).lower()
                self.assertNotIn("not configured for this organization", msg)
                self.assertNotIn("not found in database", msg)
        finally:
            db.rollback()
            db.close()

    # ------------------------------------------------------------------
    # 6. Unscoped requests (super-admin / platform, scope None) skip gating
    def test_create_employee_unscoped_skips_gate(self):
        db = _make_db()
        try:
            set_tenant_scope(None)
            # "Designer" is a master-data-only designation (not in the
            # Designation table): it must NOT be gated when unscoped.
            try:
                HrmsService.create_employee(db, {
                    "full_name": "Unscoped Pass",
                    "email": "unscoped.pass@test.local",
                    "designation": "Designer",
                })
            except ValueError as ve:
                msg = str(ve).lower()
                self.assertNotIn("not configured for this organization", msg)
                self.assertNotIn("not found in database", msg)
        finally:
            set_tenant_scope(None)
            db.rollback()
            db.close()

    # ------------------------------------------------------------------
    # 7. register_employee applies the same gate (specialization = designation)
    def test_register_employee_rejects_unconfigured_designation(self):
        db = _make_db()
        try:
            from src.services.payroll_service import PayrollService
            set_tenant_scope(["branch_a"])
            with self.assertRaises(ValueError) as ctx:
                PayrollService.register_employee(db, {
                    "full_name": "Payroll Reject",
                    "email": "payroll.reject@test.local",
                    "role": "EMPLOYEE",
                    "specialization": "Designer",  # master-data-only, not configured
                })
            self.assertIn("not configured for this organization", str(ctx.exception))
        finally:
            set_tenant_scope(None)
            db.rollback()
            db.close()

    def test_register_employee_unscoped_skips_gate(self):
        db = _make_db()
        try:
            from src.services.payroll_service import PayrollService
            set_tenant_scope(None)
            emp = PayrollService.register_employee(db, {
                "full_name": "Payroll Unscoped",
                "email": "payroll.unscoped@test.local",
                "role": "EMPLOYEE",
                "specialization": "Designer",  # would be gated if scoped
            })
            self.assertIsNotNone(emp)
        finally:
            set_tenant_scope(None)
            db.close()

    # ------------------------------------------------------------------
    # 8. _BRANCH_CACHE: a live entry short-circuits; an expired one re-runs
    def test_branch_cache_expiry_still_works(self):
        import time
        db = _make_db()
        try:
            _deps._BRANCH_CACHE.clear()
            first = _expand_tenant(db, "branch_a")
            self.assertIn("ho_user_x", first)
            key = "narrow:branch_a"
            self.assertIn(key, _deps._BRANCH_CACHE)
            # Expired entry -> the query re-runs and yields the same set
            _deps._BRANCH_CACHE[key] = (time.time() - 1.0, first)
            second = _expand_tenant(db, "branch_a")
            self.assertEqual(second, first)
            # Live entry -> returned verbatim without re-querying
            _deps._BRANCH_CACHE[key] = (time.time() + 30.0, ["sentinel"])
            self.assertEqual(_expand_tenant(db, "branch_a"), ["sentinel"])
            _deps._BRANCH_CACHE.clear()
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
