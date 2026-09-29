import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from src.database.base import Base
from src.utils.timezone import now_ist_naive


class ProductCategory(Base):
    __tablename__ = "erp_product_categories"

    id = Column(String, primary_key=True, index=True, default=lambda: f"cat_{uuid.uuid4().hex[:8]}")
    name = Column(String(150), nullable=False, index=True)
    category_code = Column(String(50), unique=True, index=True, nullable=True)
    description = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    status = Column(String(50), default="ACTIVE")
    created_at = Column(DateTime, default=now_ist_naive)


class Brand(Base):
    __tablename__ = "erp_brands"

    id = Column(String, primary_key=True, index=True, default=lambda: f"brand_{uuid.uuid4().hex[:8]}")
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    manufacturer = Column(String(150), nullable=True)
    image_url = Column(Text, nullable=True)
    status = Column(String(50), default="ACTIVE")
    created_at = Column(DateTime, default=now_ist_naive)


class UnitOfMeasure(Base):
    __tablename__ = "erp_uoms"

    id = Column(String, primary_key=True, index=True, default=lambda: f"uom_{uuid.uuid4().hex[:8]}")
    name = Column(String(50), nullable=False, index=True)
    abbreviation = Column(String(20), nullable=False)
    unit_type = Column(String(50), nullable=True)
    base_unit = Column(Boolean, default=False)
    conversion_rate = Column(Float, default=1.0)
    status = Column(String(50), default="ACTIVE")
    created_at = Column(DateTime, default=now_ist_naive)


class Product(Base):
    __tablename__ = "erp_products"

    id = Column(String, primary_key=True, index=True, default=lambda: f"prod_{uuid.uuid4().hex[:8]}")
    
    # 1. Basic & Identity
    name = Column(String(255), nullable=False, index=True)
    unique_item_name = Column(String(255), nullable=True)
    item_code = Column(String(100), nullable=True, index=True)
    sku = Column(String(100), unique=True, index=True, nullable=False)
    barcode = Column(String(100), index=True, nullable=True)
    secondary_barcode = Column(String(100), index=True, nullable=True)
    hsn_code = Column(String(100), index=True, nullable=True)

    category_id = Column(String, ForeignKey("erp_product_categories.id", ondelete="SET NULL"), nullable=True)
    category_name = Column(String(100), nullable=True)
    sub_category_name = Column(String(100), nullable=True)
    brand_id = Column(String, ForeignKey("erp_brands.id", ondelete="SET NULL"), nullable=True)
    brand_name = Column(String(100), nullable=True)
    uom_id = Column(String, ForeignKey("erp_uoms.id", ondelete="SET NULL"), nullable=True)
    uom_name = Column(String(50), nullable=True)

    image_url = Column(Text, nullable=True)
    short_description = Column(Text, nullable=True)
    long_description = Column(Text, nullable=True)
    specifications = Column(JSON, default=dict)

    # 2. Pricing, Tax & Tiers
    selling_price = Column(Float, default=0.0)
    is_tax_inclusive = Column(Boolean, default=True)
    sales_tax_name = Column(String(50), default="GST")
    tax_percent = Column(Float, default=18.0)
    sales_price_after_tax = Column(Float, default=0.0)
    mrp = Column(Float, default=0.0)
    discount_limit = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    wholesale_price = Column(Float, default=0.0)
    b2b_price = Column(Float, default=0.0)
    distributor_price = Column(Float, default=0.0)

    # 3. Purchasing & Vendor
    purchase_price = Column(Float, default=0.0)
    is_purchase_tax_inclusive = Column(Boolean, default=True)
    purchase_tax_name = Column(String(50), default="GST")
    purchase_tax_percent = Column(Float, default=18.0)
    purchase_price_after_tax = Column(Float, default=0.0)
    supplier = Column(String(150), nullable=True)
    preferred_supplier = Column(String(150), nullable=True)
    supplier_invoice_number = Column(String(100), nullable=True)
    supplier_invoice_date = Column(String(50), nullable=True)
    item_received_date = Column(String(50), nullable=True)

    # 4. Stock & Batches
    initial_stock = Column(Integer, default=0)
    on_hand_stock = Column(Integer, default=0)
    reorder_level = Column(Integer, default=5)
    safety_stock = Column(Integer, default=0)
    mfg_date = Column(String(50), nullable=True)
    expiry_date = Column(String(50), nullable=True)
    stock_batch_number = Column(String(100), nullable=True)

    # 5. Flags & Operations
    status = Column(String(50), default="ACTIVE")  # ACTIVE, INACTIVE, DISCONTINUED
    is_published_online = Column(Boolean, default=True)
    is_featured_online = Column(Boolean, default=False)
    is_service_item = Column(Boolean, default=False)
    need_to_print_barcode_sticker = Column(Boolean, default=True)
    is_master_catalog = Column(Boolean, default=False)
    is_synced_to_pos = Column(Boolean, default=True)

    created_at = Column(DateTime, default=now_ist_naive)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)


class MasterCatalogProduct(Base):
    __tablename__ = "erp_master_catalog_products"

    id = Column(String, primary_key=True, index=True, default=lambda: f"mcat_{uuid.uuid4().hex[:8]}")
    name = Column(String(255), nullable=False, index=True)
    unique_item_name = Column(String(255), nullable=True)
    item_code = Column(String(100), nullable=True)
    sku = Column(String(100), index=True, nullable=False)
    barcode = Column(String(100), index=True, nullable=True)
    secondary_barcode = Column(String(100), nullable=True)
    hsn_code = Column(String(100), nullable=True)
    category = Column(String(100), nullable=False, index=True)
    sub_category = Column(String(100), nullable=True)
    brand = Column(String(100), nullable=False, index=True)
    unit = Column(String(50), default="Pcs")
    mrp = Column(Float, default=0.0)
    purchase_price = Column(Float, default=0.0)
    selling_price = Column(Float, default=0.0)
    tax_percent = Column(Float, default=18.0)
    reorder_level = Column(Integer, default=10)
    mfg_date = Column(String(50), nullable=True)
    expiry_date = Column(String(50), nullable=True)
    image_url = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    specifications = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_ist_naive)


class StockMovement(Base):
    __tablename__ = "erp_stock_movements"

    id = Column(String, primary_key=True, index=True, default=lambda: f"mov_{uuid.uuid4().hex[:8]}")
    product_id = Column(String, ForeignKey("erp_products.id", ondelete="CASCADE"), nullable=False, index=True)
    product_name = Column(String(255), nullable=False)
    movement_type = Column(String(50), nullable=False)  # IN, OUT, ADJUSTMENT, SALE, RETURN
    quantity = Column(Integer, nullable=False)
    previous_stock = Column(Integer, default=0)
    new_stock = Column(Integer, default=0)
    reference_type = Column(String(100), nullable=True)  # POS_SALE, GRN, MANUAL_ADJUSTMENT, AUDIT
    reference_no = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    performed_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)


class FreeScheme(Base):
    __tablename__ = "erp_free_schemes"

    id = Column(String, primary_key=True, index=True, default=lambda: f"sch_{uuid.uuid4().hex[:8]}")
    name = Column(String(255), nullable=False)
    applies_to = Column(String(100), nullable=True)
    buy_quantity = Column(Integer, nullable=True)
    get_quantity = Column(Integer, nullable=True)
    get_product_id = Column(String, nullable=True)
    get_product_name = Column(String(255), nullable=True)
    discount_percentage = Column(Float, nullable=True)
    status = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)


