import uuid
import re
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc

from src.models.inventory import (
    ProductCategory,
    Brand,
    UnitOfMeasure,
    Product,
    MasterCatalogProduct,
    StockMovement,
    FreeScheme
)
from src.utils.timezone import now_ist_naive
from src.config.settings import settings

logger = logging.getLogger(__name__)


class InventoryService:

    @staticmethod
    def get_inventory_items(
        db: Session,
        search: Optional[str] = None,
        category: Optional[str] = None,
        brand: Optional[str] = None,
        unit: Optional[str] = None,
        stock_status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        query = db.query(Product).order_by(Product.created_at.desc())

        if search:
            s = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(Product.name).like(s),
                    func.lower(Product.sku).like(s),
                    func.lower(Product.barcode).like(s),
                    func.lower(Product.brand_name).like(s),
                    func.lower(Product.category_name).like(s)
                )
            )

        if category and category != "All Categories":
            query = query.filter(Product.category_name == category)

        if brand and brand != "All Brands":
            query = query.filter(Product.brand_name == brand)

        if unit and unit != "All Units":
            query = query.filter(Product.uom_name == unit)

        products = query.all()
        results = []

        for p in products:
            curr_stock = p.on_hand_stock if p.on_hand_stock is not None else p.initial_stock or 0
            reorder = p.reorder_level or 5

            if curr_stock <= 0:
                calc_stock_status = "Out of Stock"
            elif curr_stock <= reorder:
                calc_stock_status = "Low Stock"
            else:
                calc_stock_status = "In Stock"

            if stock_status and stock_status != "All" and calc_stock_status != stock_status:
                continue

            specs = p.specifications if isinstance(p.specifications, dict) else {}

            results.append({
                "id": p.id,
                "name": p.name,
                "unique_item_name": p.unique_item_name or specs.get("unique_item_name") or p.name,
                "item_code": p.item_code or specs.get("item_code") or p.sku,
                "sku": p.sku,
                "barcode": p.barcode or "",
                "secondary_barcode": p.secondary_barcode or specs.get("secondary_barcode") or "",
                "hsn_code": p.hsn_code or specs.get("hsn_code") or "",
                "category": p.category_name or "General",
                "category_name": p.category_name or "General",
                "sub_category": p.sub_category_name or specs.get("sub_category") or "",
                "brand": p.brand_name or "In-House",
                "brand_name": p.brand_name or "In-House",
                "unit": p.uom_name or "Pcs",
                "uom_name": p.uom_name or "Pcs",
                "stock": curr_stock,
                "on_hand_stock": curr_stock,
                "initial_stock": p.initial_stock or 0,
                "initialStock": p.initial_stock or 0,
                "stockStatus": calc_stock_status,
                "status": "Active" if p.status == "ACTIVE" else "Inactive",
                "mrp": float(p.mrp or 0.0),
                "purchasePrice": float(p.purchase_price or 0.0),
                "purchase_price": float(p.purchase_price or 0.0),
                "sellingPrice": float(p.selling_price or p.mrp or 0.0),
                "selling_price": float(p.selling_price or p.mrp or 0.0),
                "sales_tax_mode": "Tax Inclusive" if p.is_tax_inclusive else "Tax Exclusive",
                "is_tax_inclusive": p.is_tax_inclusive if p.is_tax_inclusive is not None else True,
                "sales_tax_name": p.sales_tax_name or "GST",
                "taxPercent": float(p.tax_percent or 18.0),
                "tax_percent": float(p.tax_percent or 18.0),
                "sales_price_after_tax": float(p.sales_price_after_tax or p.selling_price or p.mrp or 0.0),
                "discount_limit": float(p.discount_limit or 0.0),
                "discount_amount": float(p.discount_amount or 0.0),
                "wholesale_price": float(p.wholesale_price or 0.0),
                "min_wholesale_qty": specs.get("min_wholesale_qty", 10),
                "b2b_price": float(p.b2b_price or 0.0),
                "min_b2b_qty": specs.get("min_b2b_qty", 5),
                "distributor_price": float(p.distributor_price or 0.0),
                "min_distributor_qty": specs.get("min_distributor_qty", 50),
                "is_purchase_tax_inclusive": p.is_purchase_tax_inclusive if p.is_purchase_tax_inclusive is not None else True,
                "purchase_tax_name": p.purchase_tax_name or "GST",
                "purchase_tax_percent": float(p.purchase_tax_percent or 18.0),
                "purchase_price_after_tax": float(p.purchase_price_after_tax or p.purchase_price or 0.0),
                "supplier": p.supplier or "",
                "preferred_supplier": p.preferred_supplier or p.supplier or "",
                "supplier_invoice_number": p.supplier_invoice_number or "",
                "supplier_invoice_date": p.supplier_invoice_date or "",
                "item_received_date": p.item_received_date or "",
                "reorderLevel": reorder,
                "reorder_level": reorder,
                "safety_stock": p.safety_stock or 0,
                "mfg_date": p.mfg_date or specs.get("mfg_date") or "",
                "expiry_date": p.expiry_date or specs.get("expiry_date") or "",
                "stock_batch_number": p.stock_batch_number or specs.get("stock_batch_number") or "",
                "stock_batch_expiry_date": specs.get("stock_batch_expiry_date", ""),
                "opening_stock_batch_number": specs.get("opening_stock_batch_number", ""),
                "opening_stock_batch_expiry_date": specs.get("opening_stock_batch_expiry_date", ""),
                "warehouse": specs.get("warehouse", "Main Warehouse"),
                "location_in_warehouse": specs.get("location_in_warehouse", "Aisle 1"),
                "has_manual_batch": bool(specs.get("has_manual_batch", False)),
                "is_published_online": bool(p.is_published_online),
                "is_featured_online": bool(p.is_featured_online),
                "is_service_item": bool(p.is_service_item),
                "need_to_print_barcode_sticker": bool(p.need_to_print_barcode_sticker),
                "not_for_sale": bool(specs.get("not_for_sale", False)),
                "only_for_portal": bool(specs.get("only_for_portal", False)),
                "not_for_portal": bool(specs.get("not_for_portal", False)),
                "has_label": bool(specs.get("has_label", True)),
                "label_headings": specs.get("label_headings", ""),
                "weighing_scale_code": specs.get("weighing_scale_code", ""),
                "conversion_factor": specs.get("conversion_factor", "1"),
                "keywords": specs.get("keywords", ""),
                "accessories_keyword": specs.get("accessories_keyword", ""),
                "imageUrl": p.image_url or "",
                "image_url": p.image_url or "",
                "category_image": specs.get("category_image", ""),
                "shortDescription": p.short_description or "",
                "short_description": p.short_description or "",
                "long_description": p.long_description or "",
                "description_html": specs.get("description_html", ""),
                "specifications": specs,
                "isSyncedToPos": bool(p.is_synced_to_pos),
                "createdAt": p.created_at.strftime("%d/%m/%Y") if p.created_at else ""
            })

        return results

    @staticmethod
    def create_inventory_item(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        sku = (data.get("sku") or data.get("item_code") or "").strip()
        if not sku:
            sku = f"SKU-{uuid.uuid4().hex[:6].upper()}"

        barcode = (data.get("barcode") or "").strip()
        if not barcode:
            barcode = f"890{uuid.uuid4().hex[:9].upper()}"

        stock_val = int(data.get("initialStock") or data.get("initial_stock") or data.get("stock") or 0)
        reorder_val = int(data.get("reorderLevel") or data.get("reorder_level") or 5)
        safety_val = int(data.get("safety_stock") or 0)

        prod = Product(
            id=f"prod_{uuid.uuid4().hex[:8]}",
            name=data.get("name", "New Product").strip(),
            unique_item_name=data.get("unique_item_name") or data.get("name"),
            item_code=data.get("item_code") or sku,
            sku=sku,
            barcode=barcode,
            secondary_barcode=data.get("secondary_barcode"),
            hsn_code=data.get("hsn_code"),
            category_name=data.get("category") or data.get("category_name") or "Supplements",
            sub_category_name=data.get("sub_category") or data.get("sub_category_name"),
            brand_name=data.get("brand") or data.get("brand_name") or "In-House",
            uom_name=data.get("unit") or data.get("uom_name") or "Pcs",
            image_url=data.get("imageUrl") or data.get("image_url") or "",
            short_description=data.get("shortDescription") or data.get("short_description"),
            long_description=data.get("long_description"),
            specifications=data.get("specifications") or {},
            selling_price=float(data.get("sellingPrice") or data.get("selling_price") or data.get("mrp") or 0.0),
            is_tax_inclusive=bool(data.get("is_tax_inclusive", True)),
            sales_tax_name=data.get("sales_tax_name", "GST"),
            tax_percent=float(data.get("taxPercent") or data.get("tax_percent") or 18.0),
            sales_price_after_tax=float(data.get("sales_price_after_tax") or data.get("sellingPrice") or data.get("selling_price") or 0.0),
            mrp=float(data.get("mrp") or 0.0),
            discount_limit=float(data.get("discount_limit") or 0.0),
            discount_amount=float(data.get("discount_amount") or 0.0),
            wholesale_price=float(data.get("wholesale_price") or 0.0),
            b2b_price=float(data.get("b2b_price") or 0.0),
            distributor_price=float(data.get("distributor_price") or 0.0),
            purchase_price=float(data.get("purchasePrice") or data.get("purchase_price") or 0.0),
            is_purchase_tax_inclusive=bool(data.get("is_purchase_tax_inclusive", True)),
            purchase_tax_name=data.get("purchase_tax_name", "GST"),
            purchase_tax_percent=float(data.get("purchase_tax_percent") or 18.0),
            purchase_price_after_tax=float(data.get("purchase_price_after_tax") or data.get("purchasePrice") or 0.0),
            supplier=data.get("supplier"),
            preferred_supplier=data.get("preferred_supplier"),
            supplier_invoice_number=data.get("supplier_invoice_number"),
            supplier_invoice_date=data.get("supplier_invoice_date"),
            item_received_date=data.get("item_received_date"),
            initial_stock=stock_val,
            on_hand_stock=stock_val,
            reorder_level=reorder_val,
            safety_stock=safety_val,
            mfg_date=data.get("mfg_date"),
            expiry_date=data.get("expiry_date"),
            stock_batch_number=data.get("stock_batch_number"),
            status="ACTIVE" if data.get("status", "Active") in ["Active", "ACTIVE"] else "INACTIVE",
            is_published_online=bool(data.get("is_published_online", True)),
            is_featured_online=bool(data.get("is_featured_online", False)),
            is_service_item=bool(data.get("is_service_item", False)),
            need_to_print_barcode_sticker=bool(data.get("need_to_print_barcode_sticker", True)),
            is_master_catalog=False,
            is_synced_to_pos=True
        )
        db.add(prod)
        db.flush()

        # Record Initial Stock Movement if stock > 0
        if stock_val > 0:
            db.add(StockMovement(
                id=f"mov_{uuid.uuid4().hex[:8]}",
                product_id=prod.id,
                product_name=prod.name,
                movement_type="IN",
                quantity=stock_val,
                previous_stock=0,
                new_stock=stock_val,
                reference_type="MANUAL_CREATE",
                reference_no=f"ADD-{prod.sku}",
                notes="Product created with initial stock",
                performed_by=data.get("performed_by", "Admin")
            ))

        db.commit()
        db.refresh(prod)
        return {"id": prod.id, "name": prod.name, "sku": prod.sku, "message": "Product added to inventory successfully"}

    @staticmethod
    def update_inventory_item(db: Session, item_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        prod = db.query(Product).filter(Product.id == item_id).first()
        if not prod:
            raise ValueError("Product not found")

        for k, v in data.items():
            if k == "name" and v:
                prod.name = v
            elif k == "unique_item_name":
                prod.unique_item_name = v
            elif k == "item_code":
                prod.item_code = v
            elif k == "sku" and v:
                prod.sku = v
            elif k == "barcode":
                prod.barcode = v
            elif k == "secondary_barcode":
                prod.secondary_barcode = v
            elif k == "hsn_code":
                prod.hsn_code = v
            elif k in ["category", "category_name"] and v:
                prod.category_name = v
            elif k in ["sub_category", "sub_category_name"]:
                prod.sub_category_name = v
            elif k in ["brand", "brand_name"] and v:
                prod.brand_name = v
            elif k in ["unit", "uom_name"] and v:
                prod.uom_name = v
            elif k in ["purchasePrice", "purchase_price"] and v is not None:
                prod.purchase_price = float(v)
            elif k == "mrp" and v is not None:
                prod.mrp = float(v)
            elif k in ["sellingPrice", "selling_price"] and v is not None:
                prod.selling_price = float(v)
            elif k in ["taxPercent", "tax_percent"] and v is not None:
                prod.tax_percent = float(v)
            elif k in ["reorderLevel", "reorder_level"] and v is not None:
                prod.reorder_level = int(v)
            elif k == "safety_stock" and v is not None:
                prod.safety_stock = int(v)
            elif k in ["imageUrl", "image_url"]:
                prod.image_url = v
            elif k == "mfg_date":
                prod.mfg_date = v
            elif k == "expiry_date":
                prod.expiry_date = v
            elif k == "stock_batch_number":
                prod.stock_batch_number = v
            elif k == "supplier":
                prod.supplier = v
            elif k == "preferred_supplier":
                prod.preferred_supplier = v
            elif k == "supplier_invoice_number":
                prod.supplier_invoice_number = v
            elif k == "supplier_invoice_date":
                prod.supplier_invoice_date = v
            elif k == "item_received_date":
                prod.item_received_date = v
            elif k == "discount_limit" and v is not None:
                prod.discount_limit = float(v)
            elif k == "discount_amount" and v is not None:
                prod.discount_amount = float(v)
            elif k == "wholesale_price" and v is not None:
                prod.wholesale_price = float(v)
            elif k == "b2b_price" and v is not None:
                prod.b2b_price = float(v)
            elif k == "distributor_price" and v is not None:
                prod.distributor_price = float(v)
            elif k == "is_published_online":
                prod.is_published_online = bool(v)
            elif k == "is_featured_online":
                prod.is_featured_online = bool(v)
            elif k == "is_service_item":
                prod.is_service_item = bool(v)
            elif k == "need_to_print_barcode_sticker":
                prod.need_to_print_barcode_sticker = bool(v)
            elif k == "status" and v:
                prod.status = "ACTIVE" if v in ["Active", "ACTIVE"] else "INACTIVE"
            elif k in ["shortDescription", "short_description"]:
                prod.short_description = v
            elif k == "long_description":
                prod.long_description = v
            elif k == "specifications" and isinstance(v, dict):
                current_specs = prod.specifications or {}
                current_specs.update(v)
                prod.specifications = current_specs

        db.commit()
        db.refresh(prod)
        return {"id": prod.id, "name": prod.name, "message": "Product updated successfully"}

    @staticmethod
    def delete_inventory_item(db: Session, item_id: str) -> Dict[str, Any]:
        prod = db.query(Product).filter(Product.id == item_id).first()
        if not prod:
            raise ValueError("Product not found")
        db.delete(prod)
        db.commit()
        return {"message": "Product deleted successfully"}

    @staticmethod
    def bulk_delete_items(db: Session, product_ids: List[str]) -> Dict[str, Any]:
        if not product_ids:
            return {"deleted_count": 0, "message": "No product IDs provided"}
        deleted_count = db.query(Product).filter(Product.id.in_(product_ids)).delete(synchronize_session=False)
        db.commit()
        return {"deleted_count": deleted_count, "message": f"Successfully deleted {deleted_count} products"}

    @staticmethod
    def bulk_sync_to_pos(db: Session, product_ids: List[str], sync_status: bool = True) -> Dict[str, Any]:
        if not product_ids:
            return {"synced_count": 0, "message": "No product IDs provided"}
        prods = db.query(Product).filter(Product.id.in_(product_ids)).all()
        for p in prods:
            p.is_synced_to_pos = sync_status
            if sync_status:
                p.status = "ACTIVE"
        db.commit()
        return {
            "synced_count": len(prods),
            "message": f"Successfully {'imported and synchronized to POS terminal' if sync_status else 'removed from POS terminal'} for {len(prods)} product(s)"
        }

    @staticmethod
    def toggle_pos_sync(db: Session, product_id: str) -> Dict[str, Any]:
        prod = db.query(Product).filter(Product.id == product_id).first()
        if not prod:
            raise ValueError("Product not found")
        prod.is_synced_to_pos = not bool(prod.is_synced_to_pos)
        if prod.is_synced_to_pos:
            prod.status = "ACTIVE"
        db.commit()
        return {
            "id": prod.id,
            "name": prod.name,
            "is_synced_to_pos": prod.is_synced_to_pos,
            "message": f"Product {'imported to POS terminal' if prod.is_synced_to_pos else 'hidden from POS terminal'} successfully"
        }

    @staticmethod
    def generate_barcode(db: Session, item_id: str, barcode_type: str = "EAN-13") -> Dict[str, Any]:
        prod = db.query(Product).filter(Product.id == item_id).first()
        if not prod:
            raise ValueError("Product not found")

        # Generate standard 13-digit EAN code
        code = f"890{uuid.uuid4().int % 10000000000:010d}"
        prod.barcode = code
        db.commit()
        return {"id": prod.id, "barcode": code, "message": "Barcode generated successfully"}

    @staticmethod
    def bulk_generate_barcodes(db: Session, barcode_type: str = "EAN-13") -> Dict[str, Any]:
        prods = db.query(Product).filter(or_(Product.barcode == None, Product.barcode == "")).all()
        count = 0
        for p in prods:
            p.barcode = f"890{uuid.uuid4().int % 10000000000:010d}"
            count += 1
        db.commit()
        return {"generated_count": count, "message": f"Generated {count} barcodes"}

    @staticmethod
    def get_free_schemes(db: Session) -> List[Dict[str, Any]]:
        schemes = db.query(FreeScheme).order_by(FreeScheme.created_at.desc()).all()
        return [
            {
                "id": s.id,
                "name": s.name,
                "appliesTo": s.applies_to,
                "buyQuantity": s.buy_quantity,
                "getQuantity": s.get_quantity,
                "getProductId": s.get_product_id,
                "getProductName": s.get_product_name,
                "discountPercentage": s.discount_percentage,
                "status": "Active" if s.status == "ACTIVE" else "Inactive",
                "createdAt": s.created_at.strftime("%d/%m/%Y") if s.created_at else ""
            }
            for s in schemes
        ]

    @staticmethod
    def create_free_scheme(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        sch = FreeScheme(
            id=f"sch_{uuid.uuid4().hex[:8]}",
            name=data.get("name", "Special Promotional Scheme").strip(),
            applies_to=data.get("appliesTo", "All"),
            buy_quantity=int(data.get("buyQuantity", 1)),
            get_quantity=int(data.get("getQuantity", 1)),
            get_product_id=data.get("getProductId"),
            get_product_name=data.get("getProductName"),
            discount_percentage=float(data.get("discountPercentage", 100.0)),
            status="ACTIVE"
        )
        db.add(sch)
        db.commit()
        db.refresh(sch)
        return {"id": sch.id, "name": sch.name, "message": "Free scheme saved successfully"}

    @staticmethod
    def delete_free_scheme(db: Session, scheme_id: str) -> Dict[str, Any]:
        sch = db.query(FreeScheme).filter(FreeScheme.id == scheme_id).first()
        if not sch:
            raise ValueError("Scheme not found")
        db.delete(sch)
        db.commit()
        return {"message": "Scheme deleted successfully"}

    @staticmethod
    def get_master_catalog_items(
        db: Session,
        search: Optional[str] = None,
        category: Optional[str] = None,
        brand: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        query = db.query(MasterCatalogProduct).filter(MasterCatalogProduct.is_active == True)

        clean_q = search.strip() if search else ""
        is_barcode_query = bool(clean_q and clean_q.isdigit() and len(clean_q) >= 4)

        if is_barcode_query:
            query = query.filter(
                or_(
                    MasterCatalogProduct.barcode == clean_q,
                    MasterCatalogProduct.barcode.like(f"{clean_q}%")
                )
            )
        elif clean_q:
            s = f"%{clean_q.lower()}%"
            query = query.filter(
                or_(
                    func.lower(MasterCatalogProduct.name).like(s),
                    func.lower(MasterCatalogProduct.sku).like(s),
                    func.lower(MasterCatalogProduct.barcode).like(s),
                    func.lower(MasterCatalogProduct.category).like(s),
                    func.lower(MasterCatalogProduct.brand).like(s)
                )
            )

        if category and category != "All Categories":
            query = query.filter(MasterCatalogProduct.category == category)

        if brand and brand != "All Brands":
            query = query.filter(MasterCatalogProduct.brand == brand)

        items = query.all()

        # Dynamic Real-Time Barcode & AI Catalog Discovery if search query is provided and no local DB match found
        if len(items) == 0 and clean_q:
            discovered_item = None

            # 1. Fast Dedicated External Barcode Registries (Open Food Facts & Go-UPC)
            if is_barcode_query:
                # 1A. Open Food Facts
                try:
                    import urllib.request
                    off_url = f"https://world.openfoodfacts.org/api/v2/product/{clean_q}.json"
                    req = urllib.request.Request(off_url, headers={"User-Agent": "Mozilla/5.0 (GymWeb Enterprise ERP)"})
                    with urllib.request.urlopen(req, timeout=3.5) as resp:
                        data = json.loads(resp.read().decode())
                        if data.get("status") == 1 and "product" in data:
                            p = data["product"]
                            p_name = (p.get("product_name") or p.get("product_name_en") or p.get("generic_name") or "").strip()
                            b_name = (p.get("brands") or "").strip()
                            c_name = (p.get("categories") or "Nutrition").split(",")[0].strip()
                            img = p.get("image_front_url") or p.get("image_url") or ""
                            if p_name:
                                full_title = f"{b_name} {p_name}".strip() if b_name and b_name.lower() not in p_name.lower() else p_name
                                raw_price = float(p.get("price") or 0.0)
                                discovered_item = {
                                    "name": full_title,
                                    "brand": b_name or "Generic",
                                    "category": c_name or "Nutrition",
                                    "barcode": clean_q,
                                    "sku": f"SKU-{clean_q[-6:]}",
                                    "image_url": img,
                                    "mrp": raw_price,
                                    "purchase_price": 0.0,
                                    "selling_price": raw_price,
                                    "description": f"Verified product: {full_title}"
                                }
                except Exception:
                    pass

                # 1B. Go-UPC & Merchant CDN Extraction (Targeting product-image & og:image)
                if not discovered_item:
                    try:
                        import httpx
                        with httpx.Client(timeout=3.5, headers={
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                        }) as client:
                            resp = client.get(f"https://go-upc.com/search?q={clean_q}")
                            if resp.status_code == 200:
                                html = resp.text
                                h1s = re.findall(r'<h1[^>]*>([\s\S]*?)</h1>', html)
                                if h1s:
                                    prod_title = re.sub(r'<[^>]+>', '', h1s[0]).strip()
                                    if prod_title and len(prod_title) > 3 and prod_title != clean_q:
                                        # Ported from backend_repo: Targeted product image extraction
                                        img_url = ""
                                        og_match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
                                        if og_match:
                                            img_url = og_match.group(1).strip()
                                        if not img_url:
                                            prod_img_match = re.search(r'<img[^>]+(?:class|id)=["\'][^"\']*(?:product|cover|item|main)[^"\']*["\'][^>]+src=["\']([^"\']+)["\']', html, re.IGNORECASE)
                                            if prod_img_match:
                                                img_url = prod_img_match.group(1).strip()
                                        if not img_url:
                                            cdn_match = re.search(r'(https://(?:m\.media-amazon\.com|images-amazon\.com|bbassets\.com|target\.scene7\.com)/images/[^"\s]+\.(?:jpg|png|webp))', html, re.IGNORECASE)
                                            if cdn_match:
                                                img_url = cdn_match.group(1).strip()

                                        brand = prod_title.split()[0] if prod_title.split() else "Retail"
                                        discovered_item = {
                                            "name": prod_title,
                                            "brand": brand,
                                            "category": "Supplements / Nutrition",
                                            "barcode": clean_q,
                                            "sku": f"SKU-{clean_q[-6:]}",
                                            "image_url": img_url,
                                            "mrp": 0.0,
                                            "purchase_price": 0.0,
                                            "selling_price": 0.0,
                                            "description": f"Registry product: {prod_title}"
                                        }
                    except Exception:
                        pass

            # If external registry found product, save to DB
            if discovered_item:
                new_mcat = MasterCatalogProduct(
                    id=f"mcat_{uuid.uuid4().hex[:8]}",
                    name=discovered_item["name"],
                    sku=discovered_item["sku"],
                    barcode=discovered_item["barcode"],
                    hsn_code="21069099",
                    category=discovered_item["category"],
                    brand=discovered_item["brand"],
                    unit="Pcs",
                    mrp=float(discovered_item.get("mrp", 0.0)),
                    purchase_price=float(discovered_item.get("purchase_price", 0.0)),
                    selling_price=float(discovered_item.get("selling_price", 0.0)),
                    tax_percent=18.0,
                    reorder_level=5,
                    image_url=discovered_item.get("image_url", ""),
                    description=discovered_item.get("description", "")
                )
                db.add(new_mcat)
                db.commit()
                items = [new_mcat]
            else:
                # 2. Gemini AI LLM Discovery fallback
                try:
                    from src.utils.gemini_config import get_gemini_key, build_gemini_fallback_list
                    import google.generativeai as genai

                    api_key = get_gemini_key()
                    if api_key:
                        genai.configure(api_key=api_key)
                        models = build_gemini_fallback_list()
                        prompt = f"""You are an enterprise ERP & POS Master Catalog Intelligence Engine.
Generate 1 accurate product specification for the barcode or product search query: "{clean_q}".
Provide realistic estimations in INR for MRP, purchase price (wholesale cost), and selling price for this specific item based on real-world Indian market pricing.

Respond ONLY with a JSON array with this exact schema:
[
  {{
    "name": "Full Product Name with specification",
    "sku": "BRAND-PRODUCT-SIZE",
    "barcode": "{clean_q if is_barcode_query else 'EAN13 digits'}",
    "hsn_code": "21069099",
    "category": "Supplements | Nutrition | Accessories | Merchandise | Equipment",
    "brand": "Brand Name",
    "unit": "Pcs",
    "mrp": 0.0,
    "purchase_price": 0.0,
    "selling_price": 0.0,
    "tax_percent": 18.0,
    "reorder_level": 5,
    "description": "Accurate product description"
  }}
]
"""
                        for m_name in models:
                            try:
                                g_model = genai.GenerativeModel(m_name)
                                res = g_model.generate_content(prompt)
                                if res and res.text:
                                    raw = res.text.strip()
                                    if raw.startswith("```json"):
                                        raw = raw[7:]
                                    if raw.startswith("```"):
                                        raw = raw[3:]
                                    if raw.endswith("```"):
                                        raw = raw[:-3]
                                    parsed = json.loads(raw.strip())
                                    if isinstance(parsed, list) and len(parsed) > 0:
                                        for p_obj in parsed:
                                            new_mcat = MasterCatalogProduct(
                                                id=f"mcat_{uuid.uuid4().hex[:8]}",
                                                name=p_obj.get("name", "").strip(),
                                                sku=p_obj.get("sku", f"SKU-{uuid.uuid4().hex[:6].upper()}"),
                                                barcode=p_obj.get("barcode", clean_q if is_barcode_query else f"890{uuid.uuid4().hex[:9].upper()}"),
                                                hsn_code=p_obj.get("hsn_code", "21069099"),
                                                category=p_obj.get("category", "Supplements"),
                                                brand=p_obj.get("brand", "Generic"),
                                                unit=p_obj.get("unit", "Pcs"),
                                                mrp=float(p_obj.get("mrp") or 0.0),
                                                purchase_price=float(p_obj.get("purchase_price") or 0.0),
                                                selling_price=float(p_obj.get("selling_price") or 0.0),
                                                tax_percent=float(p_obj.get("tax_percent", 18.0)),
                                                reorder_level=int(p_obj.get("reorder_level", 5)),
                                                description=p_obj.get("description", "")
                                            )
                                            db.add(new_mcat)
                                        db.commit()
                                        items = db.query(MasterCatalogProduct).filter(
                                            MasterCatalogProduct.is_active == True,
                                            or_(
                                                MasterCatalogProduct.barcode == clean_q,
                                                MasterCatalogProduct.name.ilike(f"%{clean_q}%")
                                            )
                                        ).all()
                                        break
                            except Exception:
                                continue
                except Exception:
                    pass

        # Find which SKUs and Barcodes already exist in gym inventory
        existing_skus = set(sku.lower() for (sku,) in db.query(Product.sku).all() if sku)
        existing_barcodes = set(b.strip() for (b,) in db.query(Product.barcode).all() if b and b.strip())

        # Exclude items that are already imported into local gym inventory
        unimported_items = [
            c for c in items
            if (c.sku or "").lower() not in existing_skus
            and (not c.barcode or c.barcode.strip() not in existing_barcodes)
        ]

        return [
            {
                "id": c.id,
                "name": c.name,
                "sku": c.sku,
                "sku_code": c.sku,
                "barcode": c.barcode or "",
                "category": c.category,
                "category_name": c.category,
                "brand": c.brand,
                "brand_name": c.brand,
                "unit": c.unit or "Pcs",
                "uom_name": c.unit or "Pcs",
                "mrp": float(c.mrp or 0.0),
                "purchasePrice": float(c.purchase_price or 0.0),
                "cost_price": float(c.purchase_price or 0.0),
                "sellingPrice": float(c.selling_price or c.mrp or 0.0),
                "sale_price": float(c.selling_price or c.mrp or 0.0),
                "reorderLevel": c.reorder_level or 5,
                "imageUrl": c.image_url or "",
                "image_url": c.image_url or "",
                "description": c.description or "",
                "short_description": c.description or "",
                "isImported": False,
                "source": "Global Catalog"
            }
            for c in unimported_items
        ]

    @staticmethod
    def import_from_master_catalog(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        catalog_ids = payload.get("catalog_ids", [])
        if not catalog_ids and "catalog_id" in payload:
            catalog_ids = [payload["catalog_id"]]

        initial_qty = int(payload.get("initialStock", 10))
        imported_count = 0

        for cat_id in catalog_ids:
            cat_item = db.query(MasterCatalogProduct).filter(MasterCatalogProduct.id == cat_id).first()
            if not cat_item:
                continue

            existing = db.query(Product).filter(Product.sku == cat_item.sku).first()
            if existing:
                # Add to stock
                old_stock = existing.on_hand_stock or 0
                existing.on_hand_stock = old_stock + initial_qty
                db.add(StockMovement(
                    id=f"mov_{uuid.uuid4().hex[:8]}",
                    product_id=existing.id,
                    product_name=existing.name,
                    movement_type="IN",
                    quantity=initial_qty,
                    previous_stock=old_stock,
                    new_stock=existing.on_hand_stock,
                    reference_type="CATALOG_REORDER",
                    reference_no=f"REORDER-{cat_item.sku}",
                    notes="Stock added from Master Catalog import",
                    performed_by=payload.get("performed_by", "Admin")
                ))
            else:
                prod = Product(
                    id=f"prod_{uuid.uuid4().hex[:8]}",
                    name=cat_item.name,
                    unique_item_name=cat_item.name,
                    sku=cat_item.sku,
                    item_code=cat_item.sku,
                    barcode=cat_item.barcode,
                    hsn_code=cat_item.hsn_code,
                    category_name=cat_item.category,
                    brand_name=cat_item.brand,
                    uom_name=cat_item.unit,
                    short_description=cat_item.description,
                    image_url=cat_item.image_url,
                    purchase_price=cat_item.purchase_price,
                    mrp=cat_item.mrp,
                    selling_price=cat_item.selling_price,
                    tax_percent=cat_item.tax_percent,
                    initial_stock=initial_qty,
                    on_hand_stock=initial_qty,
                    reorder_level=cat_item.reorder_level,
                    status="ACTIVE",
                    is_master_catalog=False,
                    is_synced_to_pos=True
                )
                db.add(prod)
                db.flush()
                db.add(StockMovement(
                    id=f"mov_{uuid.uuid4().hex[:8]}",
                    product_id=prod.id,
                    product_name=prod.name,
                    movement_type="IN",
                    quantity=initial_qty,
                    previous_stock=0,
                    new_stock=initial_qty,
                    reference_type="CATALOG_IMPORT",
                    reference_no=f"IMP-{cat_item.sku}",
                    notes="Imported product from Global Master Catalog",
                    performed_by=payload.get("performed_by", "Admin")
                ))
            imported_count += 1

        db.commit()
        return {"imported_count": imported_count, "message": f"Successfully imported {imported_count} product(s) into gym inventory"}

    @staticmethod
    def adjust_stock(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        product_id = data.get("product_id")
        adjustment_type = data.get("type", "IN").upper()  # IN, OUT, ADJUSTMENT
        qty = int(data.get("quantity", 0))
        reason = data.get("reason", "Manual adjustment")
        notes = data.get("notes", "")
        performed_by = data.get("performed_by", "Admin")

        prod = db.query(Product).filter(Product.id == product_id).first()
        if not prod:
            raise ValueError("Product not found")

        old_stock = prod.on_hand_stock if prod.on_hand_stock is not None else prod.initial_stock or 0

        if adjustment_type in ["IN", "RECEIVE", "RESTOCK"]:
            new_stock = old_stock + qty
            mov_type = "IN"
        elif adjustment_type in ["OUT", "ISSUE", "DAMAGE", "EXPIRED"]:
            new_stock = max(0, old_stock - qty)
            mov_type = "OUT"
        else:  # Set exact stock
            new_stock = max(0, qty)
            mov_type = "ADJUSTMENT"

        prod.on_hand_stock = new_stock

        movement = StockMovement(
            id=f"mov_{uuid.uuid4().hex[:8]}",
            product_id=prod.id,
            product_name=prod.name,
            movement_type=mov_type,
            quantity=abs(new_stock - old_stock),
            previous_stock=old_stock,
            new_stock=new_stock,
            reference_type="STOCK_ADJUSTMENT",
            reference_no=f"ADJ-{uuid.uuid4().hex[:6].upper()}",
            notes=f"{reason}: {notes}".strip(),
            performed_by=performed_by
        )
        db.add(movement)
        db.commit()

        return {
            "product_id": prod.id,
            "product_name": prod.name,
            "previous_stock": old_stock,
            "new_stock": new_stock,
            "movement_id": movement.id,
            "message": f"Stock adjusted successfully for {prod.name}"
        }

    @staticmethod
    def get_stock_movements(db: Session, product_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        query = db.query(StockMovement).order_by(StockMovement.created_at.desc())
        if product_id:
            query = query.filter(StockMovement.product_id == product_id)
        movements = query.limit(limit).all()

        return [
            {
                "id": m.id,
                "productId": m.product_id,
                "productName": m.product_name,
                "type": m.movement_type,
                "quantity": m.quantity,
                "previousStock": m.previous_stock,
                "newStock": m.new_stock,
                "referenceType": m.reference_type or "MANUAL",
                "referenceNo": m.reference_no or "",
                "notes": m.notes or "",
                "performedBy": m.performed_by or "Admin",
                "createdAt": m.created_at.strftime("%d/%m/%Y %H:%M") if m.created_at else ""
            }
            for m in movements
        ]

    @staticmethod
    def get_inventory_overview(db: Session) -> Dict[str, Any]:
        products = db.query(Product).all()
        total_items = len(products)
        total_valuation = sum(
            float(p.purchase_price or 0.0) * float(p.on_hand_stock or p.initial_stock or 0)
            for p in products
        )
        total_retail_value = sum(
            float(p.selling_price or p.mrp or 0.0) * float(p.on_hand_stock or p.initial_stock or 0)
            for p in products
        )
        low_stock = sum(
            1 for p in products
            if (p.on_hand_stock or p.initial_stock or 0) > 0 and (p.on_hand_stock or p.initial_stock or 0) <= (p.reorder_level or 5)
        )
        out_of_stock = sum(
            1 for p in products
            if (p.on_hand_stock or p.initial_stock or 0) <= 0
        )
        categories_count = db.query(func.count(func.distinct(Product.category_name))).scalar() or 0
        brands_count = db.query(func.count(func.distinct(Product.brand_name))).scalar() or 0

        return {
            "totalItems": total_items,
            "totalValuation": total_valuation,
            "totalRetailValue": total_retail_value,
            "lowStockCount": low_stock,
            "outOfStockCount": out_of_stock,
            "categoriesCount": categories_count,
            "brandsCount": brands_count
        }
