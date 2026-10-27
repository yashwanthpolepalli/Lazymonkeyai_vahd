import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from src.models.settings import GymBranch, GymSetting, PaymentMethod, MasterData
from src.models.hrms import Department, Designation
from src.models.customer import Customer
from src.models.biometric_device import BiometricDevice

class SettingsService:

    @staticmethod
    def get_all_branches(db: Session, current_user: Any = None, owner_id: str = None) -> List[Dict[str, Any]]:
        """
        Returns registered branches scoped by owner_id and role.
        """
        query = db.query(GymBranch).filter(GymBranch.is_active == True)

        effective_owner_id = owner_id
        if current_user:
            role = (current_user.role or "").strip().upper()
            if role in ["SUPER_ADMIN", "SUPERADMIN", "ADMIN"]:
                if owner_id:
                    query = query.filter(GymBranch.owner_id == owner_id)
            elif role in ["HEAD_OFFICE", "HO"]:
                ho_target = current_user.ho_id or current_user.id
                query = query.filter(or_(GymBranch.ho_id == ho_target, GymBranch.owner_id == current_user.id))
            elif role in ["OWNER"]:
                effective_owner_id = current_user.id
                branch_conditions = [GymBranch.owner_id == current_user.id]
                if current_user.branch_id:
                    branch_conditions.append(GymBranch.id == current_user.branch_id)
                query = query.filter(or_(*branch_conditions))
            elif role in ["TRAINER", "STAFF", "CUSTOMER", "MEMBER"]:
                if current_user.branch_id:
                    query = query.filter(GymBranch.id == current_user.branch_id)

        branches = query.all()

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
                    b_id = f"vahd_{uuid.uuid4().hex[:10]}"
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
                "ho_id": b.ho_id or "",
                "active_members": member_count,
                "devices_count": device_count,
                "geofence_portal_enabled": bool(b.geofence_portal_enabled),
                "status": "ONLINE" if device_count > 0 else "ACTIVE"
            })
        return result

    @staticmethod
    def create_branch(db: Session, data: Dict[str, Any], current_user: Any = None) -> GymBranch:
        from src.config.settings import settings
        branch_id = f"branch_{uuid.uuid4().hex[:6]}"
        owner_id = (current_user.id if current_user else None) or data.get("owner_id")
        ho_id = (current_user.ho_id if current_user and current_user.ho_id else None) or (current_user.id if current_user and getattr(current_user, "role", "") in ["HEAD_OFFICE", "HO"] else None) or data.get("ho_id")
        b = GymBranch(
            id=branch_id,
            gym_name=data.get("gym_name") or settings.GYM_NAME,
            branch_name=data["branch_name"],
            city=data.get("city") or "",
            address=data.get("address"),
            owner_id=owner_id,
            ho_id=ho_id,
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

    @staticmethod
    def get_master_data(db: Session, category: Optional[str] = None) -> Any:
        query = db.query(MasterData)
        if category:
            query = query.filter(MasterData.category == category)
        items = query.order_by(MasterData.display_order.asc(), MasterData.name.asc()).all()

        item_dicts = []
        for it in items:
            item_dicts.append({
                "id": it.id,
                "category": it.category,
                "name": it.name,
                "code": it.code or "",
                "description": it.description or "",
                "is_active": it.is_active is not False,
                "parent_id": it.parent_id or "",
                "parent_name": it.parent_name or "",
                "extra_info": it.extra_info or "",
                "level": it.level or "",
                "display_order": it.display_order or 0,
                "created_at": it.created_at.isoformat() if it.created_at else None,
            })

        # Also merge departments from hrms_departments if category is 'departments' or all
        if not category or category == "departments":
            existing_dept_names = {d["name"].lower() for d in item_dicts if d["category"] == "departments"}
            db_depts = db.query(Department).all()
            for d in db_depts:
                if d.name and d.name.lower() not in existing_dept_names:
                    existing_dept_names.add(d.name.lower())
                    item_dicts.append({
                        "id": d.id,
                        "category": "departments",
                        "name": d.name,
                        "code": d.code or "",
                        "description": d.description or "",
                        "is_active": d.is_active is not False,
                        "parent_id": "",
                        "parent_name": "",
                        "extra_info": "",
                        "level": "",
                        "display_order": 0,
                        "created_at": d.created_at.isoformat() if d.created_at else None,
                    })

        # Also merge designations from hrms_designations if category is 'designations' or all
        if not category or category == "designations":
            existing_desg_names = {d["name"].lower() for d in item_dicts if d["category"] == "designations"}
            db_desgs = db.query(Designation).all()
            for d in db_desgs:
                if d.title and d.title.lower() not in existing_desg_names:
                    existing_desg_names.add(d.title.lower())
                    item_dicts.append({
                        "id": d.id,
                        "category": "designations",
                        "name": d.title,
                        "code": "",
                        "description": d.description or "",
                        "is_active": True,
                        "parent_id": "",
                        "parent_name": d.department or "",
                        "extra_info": "",
                        "level": d.level or "",
                        "display_order": 0,
                        "created_at": d.created_at.isoformat() if d.created_at else None,
                    })

        if category:
            return [it for it in item_dicts if it["category"] == category]

        # Group by category
        grouped: Dict[str, List[Dict[str, Any]]] = {}
        for it in item_dicts:
            cat = it["category"]
            if cat not in grouped:
                grouped[cat] = []
            grouped[cat].append(it)
        return grouped

    @staticmethod
    def create_master_data_item(db: Session, category: str, data: Dict[str, Any]) -> Dict[str, Any]:
        name = str(data.get("name") or "").strip()
        if not name:
            raise ValueError("Item name is required")

        item_id = str(data.get("id") or "").strip()
        if not item_id:
            prefix = category[:3].lower()
            item_id = f"{prefix}_{uuid.uuid4().hex[:8]}"

        code = str(data.get("code") or "").strip() or None
        description = str(data.get("description") or "").strip() or None
        is_active = bool(data.get("is_active", True))
        parent_id = str(data.get("parent_id") or "").strip() or None
        parent_name = str(data.get("parent_name") or "").strip() or None
        extra_info = str(data.get("extra_info") or "").strip() or None
        level = str(data.get("level") or "").strip() or None
        display_order = int(data.get("display_order") or 0)

        # Check if already exists in MasterData
        existing = db.query(MasterData).filter(
            MasterData.category == category,
            or_(MasterData.id == item_id, MasterData.name.ilike(name))
        ).first()

        if existing:
            existing.name = name
            if code: existing.code = code
            if description is not None: existing.description = description
            existing.is_active = is_active
            if parent_id is not None: existing.parent_id = parent_id
            if parent_name is not None: existing.parent_name = parent_name
            if extra_info is not None: existing.extra_info = extra_info
            if level is not None: existing.level = level
            target_obj = existing
        else:
            new_item = MasterData(
                id=item_id,
                category=category,
                name=name,
                code=code,
                description=description,
                is_active=is_active,
                parent_id=parent_id,
                parent_name=parent_name,
                extra_info=extra_info,
                level=level,
                display_order=display_order,
            )
            db.add(new_item)
            target_obj = new_item

        # Synchronize with Department table if category is departments
        if category == "departments":
            dept = db.query(Department).filter(
                or_(Department.id == item_id, Department.name.ilike(name))
            ).first()
            if dept:
                dept.name = name
                if code: dept.code = code
                if description: dept.description = description
                dept.is_active = is_active
            else:
                db.add(Department(
                    id=item_id if item_id.startswith("dept_") else f"dept_{uuid.uuid4().hex[:8]}",
                    name=name,
                    code=code or name[:4].upper(),
                    description=description or "",
                    is_active=is_active
                ))

        # Synchronize with Designation table if category is designations
        if category == "designations":
            desg = db.query(Designation).filter(
                or_(Designation.id == item_id, Designation.title.ilike(name))
            ).first()
            if desg:
                desg.title = name
                if parent_name: desg.department = parent_name
                if level: desg.level = level
                if description: desg.description = description
            else:
                db.add(Designation(
                    id=item_id if item_id.startswith("desg_") else f"desg_{uuid.uuid4().hex[:8]}",
                    title=name,
                    department=parent_name or "ALL",
                    level=level or "",
                    description=description or ""
                ))

        db.commit()
        db.refresh(target_obj)
        return {
            "id": target_obj.id,
            "category": target_obj.category,
            "name": target_obj.name,
            "code": target_obj.code or "",
            "description": target_obj.description or "",
            "is_active": target_obj.is_active is not False,
            "parent_id": target_obj.parent_id or "",
            "parent_name": target_obj.parent_name or "",
            "extra_info": target_obj.extra_info or "",
            "level": target_obj.level or "",
            "display_order": target_obj.display_order or 0,
            "created_at": target_obj.created_at.isoformat() if target_obj.created_at else None,
        }

    @staticmethod
    def update_master_data_item(db: Session, category: str, item_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        item = db.query(MasterData).filter(
            MasterData.category == category,
            or_(MasterData.id == item_id, MasterData.code.ilike(item_id), MasterData.name.ilike(item_id))
        ).first()

        name = str(data.get("name") or (item.name if item else "")).strip()
        code = str(data.get("code") or (item.code if item else "")).strip() or None
        description = str(data.get("description") or (item.description if item else "")).strip() or None
        is_active = bool(data.get("is_active", item.is_active if item else True))
        parent_id = str(data.get("parent_id") or (item.parent_id if item else "")).strip() or None
        parent_name = str(data.get("parent_name") or (item.parent_name if item else "")).strip() or None
        extra_info = str(data.get("extra_info") or (item.extra_info if item else "")).strip() or None
        level = str(data.get("level") or (item.level if item else "")).strip() or None

        if not item:
            item = MasterData(
                id=item_id,
                category=category,
                name=name or item_id,
                code=code,
                description=description,
                is_active=is_active,
                parent_id=parent_id,
                parent_name=parent_name,
                extra_info=extra_info,
                level=level,
            )
            db.add(item)
        else:
            if "name" in data and data["name"]:
                item.name = name
            if "code" in data:
                item.code = code
            if "description" in data:
                item.description = description
            if "is_active" in data:
                item.is_active = is_active
            if "parent_id" in data:
                item.parent_id = parent_id
            if "parent_name" in data:
                item.parent_name = parent_name
            if "extra_info" in data:
                item.extra_info = extra_info
            if "level" in data:
                item.level = level

        # Sync department if category is departments
        if category == "departments":
            dept = db.query(Department).filter(
                or_(Department.id == item_id, Department.name.ilike(name))
            ).first()
            if dept:
                dept.name = name
                if code: dept.code = code
                if description: dept.description = description
                dept.is_active = is_active

        # Sync designation if category is designations
        if category == "designations":
            desg = db.query(Designation).filter(
                or_(Designation.id == item_id, Designation.title.ilike(name))
            ).first()
            if desg:
                desg.title = name
                if parent_name: desg.department = parent_name
                if level: desg.level = level
                if description: desg.description = description

        db.commit()
        db.refresh(item)
        return {
            "id": item.id,
            "category": item.category,
            "name": item.name,
            "code": item.code or "",
            "description": item.description or "",
            "is_active": item.is_active is not False,
            "parent_id": item.parent_id or "",
            "parent_name": item.parent_name or "",
            "extra_info": item.extra_info or "",
            "level": item.level or "",
            "display_order": item.display_order or 0,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }

    @staticmethod
    def delete_master_data_item(db: Session, category: str, item_id: str) -> bool:
        item = db.query(MasterData).filter(
            MasterData.category == category,
            or_(MasterData.id == item_id, MasterData.code.ilike(item_id), MasterData.name.ilike(item_id))
        ).first()
        if item:
            db.delete(item)

        if category == "departments":
            dept = db.query(Department).filter(
                or_(Department.id == item_id, Department.name.ilike(item_id))
            ).first()
            if dept:
                db.delete(dept)

        if category == "designations":
            desg = db.query(Designation).filter(
                or_(Designation.id == item_id, Designation.title.ilike(item_id))
            ).first()
            if desg:
                db.delete(desg)

        db.commit()
        return True

# Alias for backwards compatibility
GymSettingService = SettingsService
