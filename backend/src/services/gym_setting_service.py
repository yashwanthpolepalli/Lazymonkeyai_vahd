import uuid
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from src.models.gym_setting import GymBranch, GymSetting, PaymentMethod
from src.models.customer import Customer
from src.models.biometric_device import BiometricDevice

class GymSettingService:

    @staticmethod
    def get_all_branches(db: Session, current_user: Any = None, owner_id: str = None) -> List[Dict[str, Any]]:
        """
        Returns registered gym branches scoped by owner_id and role.
        """
        query = db.query(GymBranch).filter(GymBranch.is_active == True)

        effective_owner_id = owner_id
        if current_user:
            role = (current_user.role or "").strip().upper()
            if role in ["SUPER_ADMIN", "SUPERADMIN", "ADMIN"]:
                if owner_id:
                    query = query.filter(GymBranch.owner_id == owner_id)
            elif role in ["GYM_OWNER", "OWNER"]:
                effective_owner_id = current_user.id
                # Check if there are branches assigned to this owner
                owner_branches_count = db.query(GymBranch).filter(GymBranch.owner_id == current_user.id).count()
                if owner_branches_count > 0:
                    query = query.filter(GymBranch.owner_id == current_user.id)
                elif current_user.branch_id:
                    query = query.filter(GymBranch.id == current_user.branch_id)
            elif role in ["TRAINER", "STAFF", "CUSTOMER", "MEMBER"]:
                if current_user.branch_id:
                    query = query.filter(GymBranch.id == current_user.branch_id)

        branches = query.all()

        # If no explicit GymBranch entries found and no specific user filter, derive dynamically from Customer primary_gym_location
        if not branches and not current_user:
            distinct_locs = (
                db.query(Customer.primary_gym_location)
                .filter(Customer.primary_gym_location.isnot(None))
                .distinct()
                .all()
            )
            for loc_tuple in distinct_locs:
                loc = loc_tuple[0]
                if loc:
                    parts = loc.split("·")
                    b_name = parts[0].strip()
                    c_name = parts[1].strip() if len(parts) > 1 else ""
                    b_id = f"branch_{uuid.uuid4().hex[:6]}"
                    new_b = GymBranch(id=b_id, gym_name=b_name, branch_name=b_name, city=c_name, is_active=True)
                    db.add(new_b)
            db.commit()
            branches = db.query(GymBranch).filter(GymBranch.is_active == True).all()

        result = []
        for b in branches:
            member_count = db.query(Customer).filter(
                (Customer.branch_id == b.id) | 
                (Customer.primary_gym_location.ilike(f"%{b.branch_name}%"))
            ).count()
            device_count = db.query(BiometricDevice).filter(BiometricDevice.location.ilike(f"%{b.branch_name}%")).count()

            result.append({
                "id": b.id,
                "gym_name": b.gym_name or b.branch_name,
                "branch_name": b.branch_name,
                "city": b.city or "",
                "address": b.address or (f"{b.branch_name}, {b.city}" if b.city else b.branch_name),
                "owner_id": b.owner_id,
                "active_members": member_count,
                "devices_count": device_count,
                "status": "ONLINE" if device_count > 0 else "ACTIVE"
            })
        return result

    @staticmethod
    def create_branch(db: Session, data: Dict[str, Any], current_user: Any = None) -> GymBranch:
        from src.config.settings import settings
        branch_id = f"branch_{uuid.uuid4().hex[:6]}"
        owner_id = (current_user.id if current_user else None) or data.get("owner_id")
        b = GymBranch(
            id=branch_id,
            gym_name=data.get("gym_name") or settings.GYM_NAME,
            branch_name=data["branch_name"],
            city=data.get("city") or "",
            address=data.get("address"),
            owner_id=owner_id,
            is_active=True
        )
        db.add(b)
        db.commit()
        db.refresh(b)
        return b

    @staticmethod
    def get_settings(db: Session) -> GymSetting:
        setting = db.query(GymSetting).filter(GymSetting.id == "default").first()
        if not setting:
            setting = GymSetting(
                id="default",
                gym_name="",
                address="",
                phone="",
                gstin="",
                essl_bioserver_url="",
                enable_auto_sms=False,
                enable_gate_autolock=False,
                enable_pos=False,
                enable_inventory=False,
                enable_gst_engine=False,
                sgst_rate=0.0,
                sgst_enabled=False,
                cgst_rate=0.0,
                cgst_enabled=False,
                igst_rate=0.0,
                igst_enabled=False,
                total_gst_rate=0.0,
                tax_pricing_mode="exclusive",
                sac_code="",
                enable_discount_engine=False,
                pos_discount_presets=[],
                max_staff_discount=0.0,
                discount_sequence="before_tax",
                tier_discounts={},
            )
            db.add(setting)
            db.commit()
            db.refresh(setting)
        return setting

    @staticmethod
    def update_settings(db: Session, data: Dict[str, Any]) -> GymSetting:
        setting = db.query(GymSetting).filter(GymSetting.id == "default").first()
        if not setting:
            setting = GymSetting(id="default")
            db.add(setting)

        if "gym_name" in data:
            setting.gym_name = data.get("gym_name", "")
        if "address" in data:
            setting.address = data.get("address", "")
        if "phone" in data:
            setting.phone = data.get("phone", "")
        if "gstin" in data:
            setting.gstin = data.get("gstin", "")
        if "essl_bioserver_url" in data:
            setting.essl_bioserver_url = data.get("essl_bioserver_url", "")
        if "enable_auto_sms" in data:
            setting.enable_auto_sms = bool(data["enable_auto_sms"])
        if "enable_gate_autolock" in data:
            setting.enable_gate_autolock = bool(data["enable_gate_autolock"])
        if "enable_pos" in data:
            setting.enable_pos = bool(data["enable_pos"])
        if "enable_inventory" in data:
            setting.enable_inventory = bool(data["enable_inventory"])

        # GST / Tax Billing fields
        if "enable_gst_engine" in data:
            setting.enable_gst_engine = bool(data["enable_gst_engine"])
        if "sgst_rate" in data and data["sgst_rate"] is not None:
            setting.sgst_rate = float(data["sgst_rate"])
        if "sgst_enabled" in data:
            setting.sgst_enabled = bool(data["sgst_enabled"])
        if "cgst_rate" in data and data["cgst_rate"] is not None:
            setting.cgst_rate = float(data["cgst_rate"])
        if "cgst_enabled" in data:
            setting.cgst_enabled = bool(data["cgst_enabled"])
        if "igst_rate" in data and data["igst_rate"] is not None:
            setting.igst_rate = float(data["igst_rate"])
        if "igst_enabled" in data:
            setting.igst_enabled = bool(data["igst_enabled"])
        if "total_gst_rate" in data and data["total_gst_rate"] is not None:
            setting.total_gst_rate = float(data["total_gst_rate"])
        if "tax_pricing_mode" in data:
            setting.tax_pricing_mode = str(data["tax_pricing_mode"])
        if "sac_code" in data:
            setting.sac_code = str(data["sac_code"])

        # Discount Matrix fields
        if "enable_discount_engine" in data:
            setting.enable_discount_engine = bool(data["enable_discount_engine"])
        if "pos_discount_presets" in data:
            setting.pos_discount_presets = data["pos_discount_presets"]
        if "max_staff_discount" in data and data["max_staff_discount"] is not None:
            setting.max_staff_discount = float(data["max_staff_discount"])
        if "discount_sequence" in data:
            setting.discount_sequence = str(data["discount_sequence"])
        if "tier_discounts" in data:
            setting.tier_discounts = data["tier_discounts"]

        db.commit()
        db.refresh(setting)
        return setting

    @staticmethod
    def get_billing_dict(setting: GymSetting) -> Dict[str, Any]:
        return {
            "gym_name": setting.gym_name or "",
            "address": setting.address or "",
            "gstin": setting.gstin or "",
            "sac_code": setting.sac_code or "",
            "enable_gst_engine": bool(setting.enable_gst_engine),
            "sgst_rate": float(setting.sgst_rate or 0.0),
            "sgst_enabled": bool(setting.sgst_enabled),
            "cgst_rate": float(setting.cgst_rate or 0.0),
            "cgst_enabled": bool(setting.cgst_enabled),
            "igst_rate": float(setting.igst_rate or 0.0),
            "igst_enabled": bool(setting.igst_enabled),
            "total_gst_rate": float(setting.total_gst_rate or 0.0),
            "tax_pricing_mode": setting.tax_pricing_mode or "exclusive",
            "enable_discount_engine": bool(setting.enable_discount_engine),
            "pos_discount_presets": setting.pos_discount_presets if isinstance(setting.pos_discount_presets, list) else [],
            "max_staff_discount": float(setting.max_staff_discount or 0.0),
            "discount_sequence": setting.discount_sequence or "before_tax",
            "tier_discounts": setting.tier_discounts if isinstance(setting.tier_discounts, dict) else {},
            "updated_at": setting.updated_at.isoformat() if setting.updated_at else None,
        }

    @staticmethod
    def get_payment_methods(db: Session) -> List[PaymentMethod]:
        """
        Returns active payment methods dynamically from PostgreSQL database.
        100% dynamic without any hardcoded seed lists.
        """
        return (
            db.query(PaymentMethod)
            .filter(PaymentMethod.is_active == True)
            .order_by(PaymentMethod.created_at.asc())
            .all()
        )

    @staticmethod
    def add_payment_method(db: Session, data: Dict[str, Any]) -> PaymentMethod:
        pm_name = data["name"].strip()
        existing = db.query(PaymentMethod).filter(PaymentMethod.name.ilike(pm_name)).first()
        if existing:
            existing.is_active = True
            db.commit()
            db.refresh(existing)
            return existing
        pm_id = f"pm_{uuid.uuid4().hex[:6]}"
        new_pm = PaymentMethod(
            id=pm_id,
            name=pm_name,
            code=data.get("code") or pm_name.upper().replace(" ", "_"),
            icon=data.get("icon") or "credit-card",
            is_active=True
        )
        db.add(new_pm)
        db.commit()
        db.refresh(new_pm)
        return new_pm
