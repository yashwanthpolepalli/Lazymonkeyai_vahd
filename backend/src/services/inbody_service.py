from typing import Optional
from sqlalchemy.orm import Session
from src.models.inbody import InBodyReport

class InBodyService:

    @staticmethod
    def get_latest_inbody_report(db: Session, customer_id: str) -> Optional[InBodyReport]:
        return db.query(InBodyReport).filter(InBodyReport.customer_id == customer_id).order_by(InBodyReport.scan_date.desc()).first()
