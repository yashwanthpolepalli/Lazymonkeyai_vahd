import uuid
import string
import random
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_

from src.models.pos import PosTransaction, PosSession
from src.models.inventory import Product, StockMovement
from src.models.customer import Customer
from src.utils.timezone import now_ist_naive


def generate_receipt_number() -> str:
    chars = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"REC-{chars}"


class PosService:

    @staticmethod
    def get_pos_products(db: Session, search: Optional[str] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []

        inv_query = db.query(Product).filter(
            Product.status == "ACTIVE",
            or_(Product.is_synced_to_pos == True, Product.is_synced_to_pos == None)
        )
        if search:
            s = f"%{search.strip().lower()}%"
            inv_query = inv_query.filter(
                or_(
                    func.lower(Product.name).like(s),
                    func.lower(Product.sku).like(s),
                    func.lower(Product.barcode).like(s),
                    func.lower(Product.category_name).like(s),
                    func.lower(Product.brand_name).like(s)
                )
            )
        if category and category != "All":
            inv_query = inv_query.filter(Product.category_name == category)

        for p in inv_query.all():
            stock = int(p.on_hand_stock if p.on_hand_stock is not None else p.initial_stock or 0)
            selling_price = float(p.selling_price or p.mrp or 0.0)
            mrp = float(p.mrp or 0.0)
            tax_pct = float(p.tax_percent or 0.0)
            
            sub_label = f"{p.brand_name} • {stock} in stock" if p.brand_name else f"{stock} in stock"

            results.append({
                "id": p.id,
                "name": p.name,
                "brand": p.brand_name,
                "brand_name": p.brand_name,
                "sub": sub_label,
                "price": selling_price,
                "selling_price": selling_price,
                "mrp": mrp,
                "purchase_price": float(p.purchase_price or 0.0),
                "category": p.category_name or "",
                "category_name": p.category_name or "",
                "category_id": p.category_id,
                "stock": stock,
                "on_hand_stock": stock,
                "sku": p.sku,
                "barcode": p.barcode or "",
                "tax_percent": tax_pct,
                "taxPercent": tax_pct,
                "is_tax_inclusive": bool(p.is_tax_inclusive if p.is_tax_inclusive is not None else True),
                "reorder_level": int(p.reorder_level or 0),
                "imageUrl": p.image_url or "",
                "image_url": p.image_url or "",
                "status": p.status,
                "is_active": (p.status == "ACTIVE" or p.status is None),
                "type": "PRODUCT"
            })

        return results

    @staticmethod
    def process_checkout(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        customer_id = payload.get("customer_id")
        customer_name = payload.get("customer_name")
        customer_phone = payload.get("customer_phone")
        payment_method = payload.get("payment_method")
        discount_amount = float(payload.get("discount_amount") or 0.0)
        cashier_name = payload.get("cashier_name")
        items = payload.get("items") or []

        if not items:
            raise ValueError("Cart cannot be empty")

        invoice_number = payload.get("invoice_number") or generate_receipt_number()

        subtotal = 0.0
        tax_total = 0.0
        processed_items = []

        # Determine payment status and transaction status dynamically from payload
        payment_status = payload.get("payment_status")
        if not payment_status:
            pm_lower = (payment_method or "").lower()
            if "later" in pm_lower or "credit" in pm_lower:
                payment_status = "PENDING"
            elif "partial" in pm_lower:
                payment_status = "PARTIALLY_PAID"
            elif "refund" in pm_lower:
                payment_status = "REFUNDED"
            else:
                payment_status = "PAID"

        tx_status = payload.get("status")
        if not tx_status:
            tx_status = "ON_HOLD" if payment_status == "PENDING" else "COMPLETED"

        movement_type = payload.get("movement_type") or ("RETURN" if "refund" in (payment_method or "").lower() else "SALE")
        reference_type = payload.get("reference_type") or "POS_INVOICE"

        for item in items:
            prod_id = str(item.get("id") or item.get("product_id") or "")
            qty = int(item.get("qty") or item.get("quantity") or 1)
            unit_price = float(item.get("price") or item.get("selling_price") or 0.0)
            item_name = item.get("name") or ""
            item_tax_pct = float(item.get("taxPercent") or item.get("tax_percent") or 0.0)

            line_total = unit_price * qty
            line_tax = round(line_total * (item_tax_pct / (100.0 + item_tax_pct)), 2) if item_tax_pct > 0 else 0.0

            subtotal += line_total
            tax_total += line_tax

            processed_items.append({
                "product_id": prod_id,
                "name": item_name,
                "price": unit_price,
                "qty": qty,
                "tax": line_tax,
                "total": line_total
            })

            # Deduct stock and record stock movement for physical products
            if prod_id:
                prod = db.query(Product).filter(Product.id == prod_id).first()
                if prod:
                    old_stk = prod.on_hand_stock if prod.on_hand_stock is not None else prod.initial_stock or 0
                    new_stk = max(0, old_stk - qty) if movement_type == "SALE" else old_stk + qty
                    prod.on_hand_stock = new_stk
                    db.add(StockMovement(
                        id=f"mov_{uuid.uuid4().hex[:8]}",
                        product_id=prod.id,
                        product_name=prod.name,
                        movement_type=movement_type,
                        quantity=qty,
                        previous_stock=old_stk,
                        new_stock=new_stk,
                        reference_type=reference_type,
                        reference_no=invoice_number,
                        notes=payload.get("notes") or (f"POS sale to {customer_name}" if customer_name else "POS counter sale"),
                        performed_by=cashier_name
                    ))

        grand_total = max(0.0, subtotal - discount_amount)

        # Create POS Transaction
        tx = PosTransaction(
            id=f"pos_{uuid.uuid4().hex[:8]}",
            invoice_number=invoice_number,
            customer_id=customer_id,
            customer_name=customer_name,
            customer_phone=customer_phone,
            subtotal=round(subtotal, 2),
            tax_total=round(tax_total, 2),
            discount_total=round(discount_amount, 2),
            grand_total=round(grand_total, 2),
            payment_method=payment_method,
            payment_status=payment_status,
            status=tx_status,
            items=processed_items,
            cashier_name=cashier_name,
            notes=payload.get("notes")
        )
        db.add(tx)
        db.commit()
        db.refresh(tx)

        return {
            "id": tx.id,
            "invoiceNumber": tx.invoice_number,
            "customerName": tx.customer_name,
            "customerPhone": tx.customer_phone,
            "subtotal": tx.subtotal,
            "discount": tx.discount_total,
            "tax": tx.tax_total,
            "grandTotal": tx.grand_total,
            "paymentMethod": tx.payment_method,
            "items": tx.items,
            "dateTime": tx.created_at.strftime("%d/%m/%Y %I:%M %p") if tx.created_at else "",
            "message": "Checkout completed successfully and stock updated"
        }

    @staticmethod
    def get_recent_transactions(db: Session, limit: int = 50) -> List[Dict[str, Any]]:
        txs = db.query(PosTransaction).order_by(PosTransaction.created_at.desc()).limit(limit).all()
        results = []
        for t in txs:
            items_list = t.items if isinstance(t.items, list) else []
            items_str = ", ".join([f"{it.get('name', '')} (x{it.get('qty', 1)})" for it in items_list if it.get('name')])
            results.append({
                "id": t.id,
                "invoiceId": t.invoice_number,
                "customerName": t.customer_name,
                "customerPhone": t.customer_phone,
                "itemsStr": items_str,
                "items": items_list,
                "amount": float(t.grand_total or 0.0),
                "subtotal": float(t.subtotal or 0.0),
                "discount": float(t.discount_total or 0.0),
                "tax": float(t.tax_total or 0.0),
                "paymentMethod": t.payment_method,
                "status": t.payment_status,
                "cashier": t.cashier_name,
                "dateTimeStr": t.created_at.strftime("%d %b %Y, %I:%M %p") if t.created_at else ""
            })
        return results

    @staticmethod
    def get_daily_summary(db: Session) -> Dict[str, Any]:
        today_start = datetime.combine(date.today(), datetime.min.time())
        txs = db.query(PosTransaction).filter(PosTransaction.created_at >= today_start).all()

        total_sales = sum(float(t.grand_total or 0.0) for t in txs)
        total_tx_count = len(txs)

        payment_breakdown = {}
        for t in txs:
            method = t.payment_method or "Other"
            payment_breakdown[method] = payment_breakdown.get(method, 0.0) + float(t.grand_total or 0.0)

        total_items_sold = 0
        for t in txs:
            if isinstance(t.items, list):
                total_items_sold += sum(int(it.get("qty", 1)) for it in t.items)

        return {
            "todaySales": total_sales,
            "transactionsCount": total_tx_count,
            "itemsSold": total_items_sold,
            "averageOrderValue": round(total_sales / total_tx_count, 2) if total_tx_count > 0 else 0.0,
            "paymentBreakdown": payment_breakdown
        }
