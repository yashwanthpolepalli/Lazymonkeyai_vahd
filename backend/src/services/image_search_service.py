import re
import urllib.parse
import httpx
import logging
from typing import Optional
from sqlalchemy.orm import Session

from src.models.inventory import Product, MasterCatalogProduct
from src.utils.ai_image_control import is_ai_image_search_paused
from src.utils.gemini_config import get_gemini_key, build_gemini_fallback_list

logger = logging.getLogger(__name__)


class ImageSearchService:

    @staticmethod
    def search_dynamic_product_image(product_name: str, brand: str = "", category: str = "") -> str:
        """
        Dynamically finds or synthesizes a targeted product visual based on product title, brand, and category.
        Uses clean dynamic image search / AI graphic generator.
        """
        if is_ai_image_search_paused():
            return ""

        query_terms = [t for t in [brand, product_name, category] if t and t != "In-House" and t != "General"]
        if not query_terms:
            query_terms = [product_name]
        
        full_query = " ".join(query_terms).strip()
        encoded_query = urllib.parse.quote_plus(full_query)

        # 1. Try DuckDuckGo Fast Image Search
        try:
            with httpx.Client(timeout=5.0, headers={"User-Agent": "Mozilla/5.0"}) as client:
                res = client.get(f"https://html.duckduckgo.com/html/?q={encoded_query}+fitness+product+photo")
                if res.status_code == 200:
                    links = re.findall(r'src="(https?://[^"]+\.(?:png|jpg|jpeg|webp))"', res.text, re.IGNORECASE)
                    for link in links:
                        if not any(bad in link.lower() for bad in ["icon", "logo", "duckduckgo", "banner", "favicon"]):
                            return link
        except Exception:
            pass

        # 2. Dynamic Pollinations AI Generator for gym fitness catalog
        clean_prompt = re.sub(r'[^a-zA-Z0-9\s]', '', f"professional product photography of {full_query}, white clean gym nutrition store background, 4k ultra detailed studio lighting")
        prompt_encoded = urllib.parse.quote_plus(clean_prompt[:200])
        return f"https://image.pollinations.ai/prompt/{prompt_encoded}?width=600&height=600&nologo=true"

    @classmethod
    def enrich_single_product(cls, db: Session, product_id: str) -> Optional[str]:
        prod = db.query(Product).filter(Product.id == product_id).first()
        if not prod:
            return None

        img_url = cls.search_dynamic_product_image(
            product_name=prod.name,
            brand=prod.brand_name or "",
            category=prod.category_name or ""
        )
        if img_url:
            prod.image_url = img_url
            db.commit()
            db.refresh(prod)
        return img_url

    @classmethod
    def enrich_pending_products(cls, db: Session, limit: int = 10) -> int:
        if is_ai_image_search_paused():
            return 0

        prods = db.query(Product).filter(
            (Product.image_url == None) | (Product.image_url == "")
        ).limit(limit).all()

        enriched_count = 0
        for p in prods:
            img = cls.search_dynamic_product_image(
                product_name=p.name,
                brand=p.brand_name or "",
                category=p.category_name or ""
            )
            if img:
                p.image_url = img
                enriched_count += 1

        if enriched_count > 0:
            db.commit()
        return enriched_count
