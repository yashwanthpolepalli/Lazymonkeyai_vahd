import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from src.database.session import SessionLocal, engine
from src.database.tenant_session import (
    TenantSession,
    set_tenant_scope,
    get_tenant_scope,
)
from src.models.course import Course, CourseLanguage
from src.models.inventory import Product, ProductCategory
from src.models.pos import PosTransaction


def _clean(model, prefix):
    """Remove test rows and start fresh."""
    db = SessionLocal()
    try:
        rows = db.query(model).filter(model.id.startswith(prefix)).all()
        for r in rows:
            db.delete(r)
        db.commit()
    finally:
        db.close()


class TenantIsolationTests(unittest.TestCase):
    """Two-tenant create / collision / cross-read isolation regression."""

    # ── helpers ──────────────────────────────────────────────────────────
    def setUp(self):
        _clean(CourseLanguage, "t_cl_")
        _clean(Product, "t_prod_")
        _clean(PosTransaction, "t_pos_")

    # ── 1. cross-tenant read isolation ─────────────────────────────────
    def test_cross_tenant_read_isolation(self):
        db = SessionLocal()
        set_tenant_scope(["tenant_X"])
        db.add(CourseLanguage(id="t_cl_en_x", name="English", tenant_id="tenant_X"))
        db.add(CourseLanguage(id="t_cl_fr_x", name="French", tenant_id="tenant_X"))
        set_tenant_scope(["tenant_Y"])
        db.add(CourseLanguage(id="t_cl_en_y", name="English", tenant_id="tenant_Y"))
        db.commit()

        set_tenant_scope(["tenant_X"])
        x_rows = sorted(r.name for r in db.query(CourseLanguage).all())
        self.assertEqual(x_rows, ["English", "French"])

        set_tenant_scope(["tenant_Y"])
        y_rows = [r.name for r in db.query(CourseLanguage).all()]
        self.assertEqual(y_rows, ["English"])

        # platform admin bypass sees everything
        set_tenant_scope(None)
        all_rows = sorted(r.name for r in db.query(CourseLanguage).all())
        self.assertEqual(all_rows, ["English", "English", "French"])
        db.close()

    # ── 2. two-tenant duplicate-value create (the collision class) ─────
    def test_two_tenants_same_business_value(self):
        """Org A and Org B both create SKU 'SAME-SKU' → must BOTH succeed
        now that uniqueness is composite on (tenant_id, sku)."""
        db = SessionLocal()
        set_tenant_scope(["tenant_A"])
        db.add(Product(id="t_prod_a", name="Widget", sku="SAME-SKU",
                      tenant_id="tenant_A"))
        db.commit()

        set_tenant_scope(["tenant_B"])
        db.add(Product(id="t_prod_b", name="Widget", sku="SAME-SKU",
                      tenant_id="tenant_B"))
        db.commit()  # would raise IntegrityError under legacy global unique

        set_tenant_scope(None)
        n = db.query(Product).filter(Product.sku == "SAME-SKU").count()
        self.assertEqual(n, 2)
        db.close()

    # ── 3. same-tenant duplicate still blocked ─────────────────────────
    def test_same_tenant_duplicate_blocked(self):
        db = SessionLocal()
        set_tenant_scope(["tenant_A"])
        db.add(Product(id="t_prod_a1", name="W1", sku="DUP-SKU", tenant_id="tenant_A"))
        db.commit()
        db.add(Product(id="t_prod_a2", name="W2", sku="DUP-SKU", tenant_id="tenant_A"))
        with self.assertRaises(Exception):  # composite unique violation
            db.commit()
        db.rollback()
        db.close()

    # ── 4. writes are auto-stamped with tenant ──────────────────────────
    def test_write_stamping(self):
        db = SessionLocal()
        set_tenant_scope(["tenant_STAMP"])
        obj = Product(id="t_prod_stamp", name="Stamped", sku="STAMP-SKU")
        self.assertIsNone(obj.tenant_id)
        db.add(obj)
        db.commit()
        self.assertEqual(obj.tenant_id, "tenant_STAMP")
        db.close()

    # ── 5. HO multi-branch scope: IN(...) filter ───────────────────────
    def test_ho_multi_branch_scope(self):
        db = SessionLocal()
        set_tenant_scope(["br_ho_1", "br_ho_2"])
        db.add(CourseLanguage(id="t_cl_1", name="L1", tenant_id="br_ho_1"))
        db.add(CourseLanguage(id="t_cl_2", name="L2", tenant_id="br_ho_2"))
        db.add(CourseLanguage(id="t_cl_3", name="L3", tenant_id="br_other"))
        db.commit()

        visible = sorted(r.name for r in db.query(CourseLanguage).all())
        self.assertEqual(visible, ["L1", "L2"])  # br_other's row is hidden
        db.close()

    # ── 6. unscoped (no contextvar) = legacy behaviour ────────────────
    def test_unscoped_session_sees_all(self):
        db = SessionLocal()
        set_tenant_scope(None)
        db.add(CourseLanguage(id="t_cl_a", name="A", tenant_id="t1"))
        db.add(CourseLanguage(id="t_cl_b", name="B", tenant_id="t2"))
        db.commit()
        n = db.query(CourseLanguage).count()
        self.assertEqual(n, 2)
        db.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
