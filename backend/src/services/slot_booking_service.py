import uuid
import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from src.models.gym_slot_booking import GymSlotBooking
from src.models.customer import Customer
from src.utils.timezone import now_ist, now_ist_naive, to_ist_str

class SlotBookingService:

    @staticmethod
    def _normalize_date(date_str: Optional[str]) -> str:
        if not date_str:
            return ""
        cleaned = str(date_str).strip()
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
            try:
                dt = datetime.datetime.strptime(cleaned, fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                pass
        return cleaned

    @staticmethod
    def create_booking(db: Session, customer: Customer, data: Dict[str, Any]) -> Dict[str, Any]:
        raw_date = data.get("booking_date") or data.get("date") or ""
        booking_date = SlotBookingService._normalize_date(raw_date) or str(raw_date).strip()
        start_time = data.get("start_time") or ""
        end_time = data.get("end_time") or ""
        workout_types = data.get("workout_types") or []
        if isinstance(workout_types, str):
            workout_types = [w.strip() for w in workout_types.split(",") if w.strip()]

        branch = (
            data.get("branch")
            or data.get("branch_name")
            or getattr(customer, "primary_gym_location", None)
            or getattr(customer, "branch", None)
            or ""
        )
        booking_id = f"slot_{uuid.uuid4().hex[:8]}"

        booking = GymSlotBooking(
            id=booking_id,
            customer_id=customer.id,
            customer_name=customer.full_name or customer.name or "",
            customer_email=customer.email or "",
            customer_phone=customer.phone or "",
            branch_id=branch,
            branch_name=branch,
            booking_date=booking_date,
            start_time=str(start_time).strip(),
            end_time=str(end_time).strip(),
            workout_types=workout_types,
            status=data.get("status") or "CONFIRMED",
            notes=data.get("notes") or ""
        )
        db.add(booking)
        db.commit()
        db.refresh(booking)

        return SlotBookingService._format_booking(booking)

    @staticmethod
    def get_customer_bookings(db: Session, customer_id: str, include_past: bool = False) -> List[Dict[str, Any]]:
        """
        Fetches slot bookings for a customer with attendance status.
        By default (include_past=False), previous days' bookings (before today's 24hr EOD)
        and CANCELLED bookings are filtered out, displaying only active upcoming and today's bookings.
        When include_past=True, returns complete history ordered newest to oldest with attendance info.
        """
        bookings = db.query(GymSlotBooking).filter(
            GymSlotBooking.customer_id == customer_id
        ).all()

        # Query customer's attendance / biometric logs to cross-reference attendance
        from src.models.biometric import BiometricLog
        logs = db.query(BiometricLog).filter(
            BiometricLog.customer_id == customer_id,
            BiometricLog.status.in_(["SUCCESS", "ACCESS_GRANTED", None])
        ).all()

        attendance_by_date = {}
        for l in logs:
            if l.timestamp:
                d_str = l.timestamp.strftime("%Y-%m-%d")
                if d_str not in attendance_by_date:
                    attendance_by_date[d_str] = l
                elif l.timestamp < attendance_by_date[d_str].timestamp:
                    attendance_by_date[d_str] = l

        today_ist_str = now_ist().strftime("%Y-%m-%d")
        formatted = []
        for b in bookings:
            norm_date = SlotBookingService._normalize_date(b.booking_date)
            if not include_past:
                if b.status == "CANCELLED":
                    continue
                # Filter out bookings older than today (auto-refresh past 24hrs EOD)
                if norm_date and norm_date < today_ist_str:
                    continue
            att_log = attendance_by_date.get(norm_date)
            formatted.append(SlotBookingService._format_booking(b, attendance_log=att_log))

        def sort_key(item):
            norm_date = SlotBookingService._normalize_date(item.get("booking_date")) or "9999-99-99"
            return (norm_date, item.get("start_time") or "")

        formatted.sort(key=sort_key, reverse=include_past)
        return formatted

    @staticmethod
    def cancel_booking(db: Session, booking_id: str, customer_id: Optional[str] = None) -> bool:
        query = db.query(GymSlotBooking).filter(GymSlotBooking.id == booking_id)
        if customer_id:
            query = query.filter(GymSlotBooking.customer_id == customer_id)
        booking = query.first()
        if not booking:
            return False
        booking.status = "CANCELLED"
        db.commit()
        return True

    @staticmethod
    def get_all_bookings(db: Session, branch: Optional[str] = None, date: Optional[str] = None, customer_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query = db.query(GymSlotBooking)
        if branch:
            query = query.filter(GymSlotBooking.branch_name.ilike(f"%{branch.strip()}%"))
        if date:
            norm_date = SlotBookingService._normalize_date(date)
            query = query.filter(
                (GymSlotBooking.booking_date == date.strip()) |
                (GymSlotBooking.booking_date == norm_date)
            )
        if customer_id:
            query = query.filter(GymSlotBooking.customer_id == customer_id.strip())

        bookings = query.all()

        # Query attendance logs for all booked customers
        from src.models.biometric import BiometricLog
        cust_ids = list(set([b.customer_id for b in bookings if b.customer_id]))
        attendance_map = {}
        if cust_ids:
            logs = db.query(BiometricLog).filter(
                BiometricLog.customer_id.in_(cust_ids),
                BiometricLog.status.in_(["SUCCESS", "ACCESS_GRANTED", None])
            ).all()
            for l in logs:
                if l.timestamp and l.customer_id:
                    key = (l.customer_id, l.timestamp.strftime("%Y-%m-%d"))
                    if key not in attendance_map:
                        attendance_map[key] = l

        formatted = []
        for b in bookings:
            norm_date = SlotBookingService._normalize_date(b.booking_date)
            att_log = attendance_map.get((b.customer_id, norm_date))
            formatted.append(SlotBookingService._format_booking(b, attendance_log=att_log))

        def sort_key(item):
            norm_date = SlotBookingService._normalize_date(item.get("booking_date")) or "9999-99-99"
            return (norm_date, item.get("start_time") or "")

        formatted.sort(key=sort_key, reverse=True)
        return formatted

    @staticmethod
    def _format_booking(b: GymSlotBooking, attendance_log: Optional[Any] = None) -> Dict[str, Any]:
        time_slot = f"{b.start_time} - {b.end_time}".strip(" -") if (b.start_time or b.end_time) else ""
        norm_date = SlotBookingService._normalize_date(b.booking_date) or b.booking_date or ""
        today_ist_str = now_ist().strftime("%Y-%m-%d")

        has_attended = attendance_log is not None
        check_in_time = attendance_log.timestamp.strftime("%I:%M %p") if (attendance_log and attendance_log.timestamp) else None

        if b.status == "CANCELLED":
            attendance_status = "CANCELLED"
        elif has_attended:
            attendance_status = "ATTENDED"
        elif norm_date and norm_date < today_ist_str:
            attendance_status = "NOT_ATTENDED"
        elif norm_date == today_ist_str:
            attendance_status = "PENDING"
        else:
            attendance_status = "UPCOMING"

        return {
            "id": b.id,
            "customer_id": b.customer_id,
            "customer_name": b.customer_name or "",
            "customer_email": b.customer_email or "",
            "customer_phone": b.customer_phone or "",
            "branch": b.branch_name or b.branch_id or "",
            "branch_id": b.branch_id or "",
            "branch_name": b.branch_name or b.branch_id or "",
            "booking_date": norm_date,
            "date": norm_date,
            "start_time": b.start_time or "",
            "end_time": b.end_time or "",
            "time_slot": time_slot,
            "workout_types": b.workout_types if isinstance(b.workout_types, list) else [],
            "status": b.status or "CONFIRMED",
            "attended": has_attended,
            "attendance_status": attendance_status,
            "check_in_time": check_in_time,
            "notes": b.notes or "",
            "created_at": to_ist_str(b.created_at) if b.created_at else None,
        }


