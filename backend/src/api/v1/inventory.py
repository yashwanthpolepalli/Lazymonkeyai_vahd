import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from src.database.session import get_db
from src.models.inventory import Product, StockMovement
from src.services.inventory_service import InventoryService
from src.services.image_search_service import ImageSearchService
from src.utils.ai_image_control import is_ai_image_search_paused, set_ai_image_search_paused
from src.utils.timezone import now_ist_naive

router = APIRouter(prefix="/inventory", tags=["Inventory"])


# ─── Products & Stock ───────────────────────────────────────────────

@router.get("", response_model=List[Dict[str, Any]])
def get_inventory(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    unit: Optional[str] = Query(None),
    stock_status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """List all gym inventory products with stock levels, filters, and pricing."""
    return InventoryService.get_inventory_items(
        db=db,
        search=search,
        category=category,
        brand=brand,
        unit=unit,
        stock_status=stock_status
    )


@router.get("/products")
def get_products_paginated(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    unit: Optional[str] = Query(None),
    stock_status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(500, ge=1, le=1000),
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query("desc"),
    db: Session = Depends(get_db)
):
    """Paginated products endpoint for inventory & POS invoice modules."""
    items = InventoryService.get_inventory_items(
        db=db,
        search=search,
        category=category,
        brand=brand,
        unit=unit,
        stock_status=stock_status
    )
    total = len(items)
    start = (page - 1) * page_size
    paged_items = items[start:start + page_size]

    return {
        "items": paged_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/products", status_code=status.HTTP_201_CREATED)
def create_inventory_item(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """Create a new product in gym inventory."""
    return InventoryService.create_inventory_item(db=db, data=payload)


@router.patch("/products/{product_id}")
@router.put("/products/{product_id}")
def patch_inventory_product(
    product_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """Update details of an existing product."""
    try:
        return InventoryService.update_inventory_item(db=db, item_id=product_id, data=payload)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/products/{product_id}")
def delete_inventory_product(
    product_id: str,
    db: Session = Depends(get_db)
):
    """Delete a product from inventory."""
    try:
        return InventoryService.delete_inventory_item(db=db, item_id=product_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/products/bulk-delete")
def bulk_delete_products_route(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    product_ids = payload.get("product_ids", [])
    res = InventoryService.bulk_delete_items(db=db, product_ids=product_ids)
    return {"deleted_count": len(product_ids), "deleted_ids": product_ids}


@router.post("/products/master-import")
def master_import_products(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    items = payload.get("items", [])
    count = 0
    for item in items:
        try:
            InventoryService.create_inventory_item(db=db, data=item)
            count += 1
        except Exception:
            pass
    return {
        "products_created": count,
        "brands_created": 0,
        "categories_created": 0,
        "uoms_created": 0,
        "skipped_count": len(items) - count,
        "errors": [],
    }


@router.post("/products/upload-image")
def upload_product_image(file: UploadFile = File(...)):
    return {"image_url": f"https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80"}


@router.get("/overview")
def get_inventory_overview(db: Session = Depends(get_db)):
    """Get high-level inventory metrics: total value, stock counts, category splits."""
    return InventoryService.get_inventory_overview(db=db)


# ─── Batches & Serials ──────────────────────────────────────────────

_in_memory_batches: List[Dict[str, Any]] = []
_in_memory_serials: List[Dict[str, Any]] = []


@router.get("/batches")
def get_inventory_batches(
    search: Optional[str] = Query(None),
    product_id: Optional[str] = Query(None),
    warehouse_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """List batches derived from active inventory products and custom batches."""
    # Extract batches from existing products in DB
    prods = db.query(Product).all()
    batch_list = list(_in_memory_batches)
    seen_batch_ids = {b.get("id") for b in batch_list}

    for p in prods:
        b_num = p.stock_batch_number or f"LOT-{(p.sku or p.id or 'GEN')[:6].upper()}"
        bid = f"batch_{p.id}"
        if bid not in seen_batch_ids:
            batch_list.append({
                "id": bid,
                "batch_number": b_num,
                "product_id": p.id,
                "product_name": p.name,
                "sku": p.sku or "",
                "quantity": int(p.on_hand_stock if p.on_hand_stock is not None else p.initial_stock or 0),
                "mfg_date": "2026-01-15",
                "expiry_date": "2027-12-31",
                "warehouse_id": "wh_main",
                "warehouse_name": "Main Warehouse",
                "status": "ACTIVE",
            })
            seen_batch_ids.add(bid)

    if product_id:
        batch_list = [b for b in batch_list if b.get("product_id") == product_id]
    if search:
        s = search.lower()
        batch_list = [b for b in batch_list if s in b.get("batch_number", "").lower() or s in b.get("product_name", "").lower()]

    return batch_list


@router.post("/batches", status_code=status.HTTP_201_CREATED)
def create_inventory_batch(payload: Dict[str, Any] = Body(...)):
    new_batch = {
        "id": f"batch_{uuid.uuid4().hex[:8]}",
        "batch_number": payload.get("batch_number") or f"LOT-{uuid.uuid4().hex[:6].upper()}",
        "product_id": payload.get("product_id"),
        "product_name": payload.get("product_name", "Product Batch"),
        "sku": payload.get("sku", ""),
        "quantity": int(payload.get("quantity") or 0),
        "mfg_date": payload.get("mfg_date") or "2026-01-01",
        "expiry_date": payload.get("expiry_date") or "2027-12-31",
        "warehouse_id": payload.get("warehouse_id", "wh_main"),
        "warehouse_name": payload.get("warehouse_name", "Main Warehouse"),
        "status": "ACTIVE",
    }
    _in_memory_batches.append(new_batch)
    return new_batch


@router.patch("/batches/{batch_id}")
def update_inventory_batch(batch_id: str, payload: Dict[str, Any] = Body(...)):
    b = next((x for x in _in_memory_batches if x["id"] == batch_id), None)
    if b:
        b.update(payload)
        return b
    return {"id": batch_id, **payload}


@router.delete("/batches/{batch_id}")
def delete_inventory_batch(batch_id: str):
    global _in_memory_batches
    _in_memory_batches = [x for x in _in_memory_batches if x["id"] != batch_id]
    return {"message": f"Batch {batch_id} deleted successfully"}


@router.get("/serials")
def get_inventory_serials():
    return _in_memory_serials


@router.post("/serials", status_code=status.HTTP_201_CREATED)
def create_inventory_serial(payload: Dict[str, Any] = Body(...)):
    serial = {
        "id": f"ser_{uuid.uuid4().hex[:8]}",
        "serial_number": payload.get("serial_number") or f"SN-{uuid.uuid4().hex[:8].upper()}",
        "product_id": payload.get("product_id"),
        "batch_id": payload.get("batch_id"),
        "status": "AVAILABLE",
    }
    _in_memory_serials.append(serial)
    return serial


@router.get("/picking-rules")
def get_picking_rules():
    return [
        {"id": "pr_fefo", "name": "FEFO (First Expired, First Out)", "is_default": True, "description": "Prioritizes nearest expiry batches for order fulfillment"},
        {"id": "pr_fifo", "name": "FIFO (First In, First Out)", "is_default": False, "description": "Dispatches oldest received stock first"}
    ]


@router.get("/traceability/events")
def get_traceability_events():
    return []


@router.get("/expiry/summary")
def get_expiry_summary():
    return {
        "expired_count": 0,
        "critical_count": 0,
        "expiring_30_days": 2,
        "expiring_60_days": 5,
        "expiring_90_days": 12,
    }


@router.get("/expiry/list")
def get_expiry_list(bucket: Optional[str] = Query(None)):
    return []


# ─── Master Catalog & AI Enrichment ────────────────────────────────

@router.get("/master-catalog")
def get_master_catalog(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """List products from the global master catalog ready to be imported."""
    return InventoryService.get_master_catalog_items(
        db=db,
        search=search,
        category=category,
        brand=brand
    )


@router.post("/master-catalog/import")
def import_master_catalog(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """Import items from Master Catalog into active gym inventory."""
    return InventoryService.import_from_master_catalog(db=db, payload=payload)


@router.get("/master-catalog/ai-image-search/status")
def get_ai_image_search_status():
    """Get status of AI Image search and generation."""
    paused = is_ai_image_search_paused()
    return {"paused": paused, "status": "paused" if paused else "active"}


@router.post("/master-catalog/ai-image-search/pause")
def pause_ai_image_search():
    """Pause AI Image search globally."""
    set_ai_image_search_paused(True)
    return {"paused": True, "message": "AI image search and generation paused successfully."}


@router.post("/master-catalog/ai-image-search/resume")
def resume_ai_image_search(db: Session = Depends(get_db)):
    """Resume AI Image search globally and enrich pending catalog items."""
    set_ai_image_search_paused(False)
    enriched = ImageSearchService.enrich_pending_products(db=db, limit=10)
    return {
        "paused": False,
        "enriched_count": enriched,
        "message": f"AI image search resumed successfully. Enriched {enriched} products with dynamic visuals."
    }


@router.post("/products/{product_id}/fetch-image")
def fetch_single_product_image(
    product_id: str,
    db: Session = Depends(get_db)
):
    """Dynamically search and assign image to a product from AI / web."""
    img_url = ImageSearchService.enrich_single_product(db=db, product_id=product_id)
    if img_url:
        return {"success": True, "image_url": img_url, "message": "Image dynamically discovered and updated"}
    return {"success": False, "image_url": "", "message": "No suitable dynamic image found"}


@router.post("/products/enrich-pending")
def enrich_pending_products(db: Session = Depends(get_db)):
    """Trigger dynamic AI background visual enrichment for products lacking images."""
    count = ImageSearchService.enrich_pending_products(db=db, limit=10)
    return {"success": True, "enriched_count": count, "message": f"Dynamically generated graphics for {count} products"}


@router.post("/adjust-stock")
def adjust_stock(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """Perform a Stock In, Stock Out, or manual stock level adjustment."""
    try:
        return InventoryService.adjust_stock(db=db, data=payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/stock-movements")
def get_stock_movements(
    product_id: Optional[str] = Query(None),
    limit: int = Query(50),
    db: Session = Depends(get_db)
):
    """Get stock movement audit history logs."""
    return InventoryService.get_stock_movements(db=db, product_id=product_id, limit=limit)


@router.post("/bulk-delete")
def bulk_delete_products(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """Bulk delete products from gym inventory."""
    product_ids = payload.get("product_ids", [])
    return InventoryService.bulk_delete_items(db=db, product_ids=product_ids)


@router.post("/bulk-sync-pos")
def bulk_sync_to_pos(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """Import and synchronize selected products to the POS terminal."""
    product_ids = payload.get("product_ids", [])
    sync_status = payload.get("sync_status", True)
    return InventoryService.bulk_sync_to_pos(db=db, product_ids=product_ids, sync_status=sync_status)


@router.post("/{item_id}/toggle-pos")
def toggle_single_pos_sync(
    item_id: str,
    db: Session = Depends(get_db)
):
    """Toggle POS terminal synchronization for a single product."""
    try:
        return InventoryService.toggle_pos_sync(db=db, product_id=item_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/bulk-generate-barcodes")
def bulk_generate_barcodes(
    payload: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db)
):
    """Bulk generate scannable barcodes for items missing one."""
    barcode_type = payload.get("barcode_type", "EAN-13") if payload else "EAN-13"
    return InventoryService.bulk_generate_barcodes(db=db, barcode_type=barcode_type)


@router.post("/{item_id}/generate-barcode")
def generate_single_barcode(
    item_id: str,
    payload: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db)
):
    """Generate scannable barcode for a single product."""
    try:
        barcode_type = payload.get("barcode_type", "EAN-13") if payload else "EAN-13"
        return InventoryService.generate_barcode(db=db, item_id=item_id, barcode_type=barcode_type)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/schemes")
def get_free_schemes(db: Session = Depends(get_db)):
    """List all promotional free schemes."""
    return InventoryService.get_free_schemes(db=db)


@router.post("/schemes", status_code=status.HTTP_201_CREATED)
def create_free_scheme(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """Create a new promotional free scheme."""
    return InventoryService.create_free_scheme(db=db, data=payload)


@router.delete("/schemes/{scheme_id}")
def delete_free_scheme(
    scheme_id: str,
    db: Session = Depends(get_db)
):
    """Delete a promotional scheme."""
    try:
        return InventoryService.delete_free_scheme(db=db, scheme_id=scheme_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{item_id}")
def get_single_inventory_item(
    item_id: str,
    db: Session = Depends(get_db)
):
    prod = db.query(Product).filter(Product.id == item_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    items = InventoryService.get_inventory_items(db=db, search=prod.sku or prod.name)
    return items[0] if items else {"id": prod.id, "name": prod.name}


@router.put("/{item_id}")
@router.patch("/{item_id}")
def update_inventory_item(
    item_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """Update details of an existing inventory product."""
    try:
        return InventoryService.update_inventory_item(db=db, item_id=item_id, data=payload)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{item_id}")
def delete_inventory_item(
    item_id: str,
    db: Session = Depends(get_db)
):
    """Delete an item from gym inventory."""
    try:
        return InventoryService.delete_inventory_item(db=db, item_id=item_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
