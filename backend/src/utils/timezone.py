"""
Centralized timezone utility for FIT CLUB Backend.
All timestamps are generated in IST (India Standard Time, Asia/Kolkata, UTC+5:30).
"""
import datetime

# IST is UTC+5:30 — no pytz dependency required
IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))


def now_ist() -> datetime.datetime:
    """Return the current datetime in IST (Asia/Kolkata, UTC+5:30)."""
    return datetime.datetime.now(tz=IST)


def now_ist_naive() -> datetime.datetime:
    """
    Return the current IST datetime WITHOUT tzinfo (timezone-naive).
    Use this for SQLAlchemy Column defaults that store naive datetimes.
    """
    return datetime.datetime.now(tz=IST).replace(tzinfo=None)


def today_ist_start() -> datetime.datetime:
    """Return the start of today (00:00:00) in IST, as a naive datetime."""
    ist_now = datetime.datetime.now(tz=IST)
    return ist_now.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)


def today_ist_end() -> datetime.datetime:
    """Return the end of today (23:59:59) in IST, as a naive datetime."""
    ist_now = datetime.datetime.now(tz=IST)
    return ist_now.replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=None)


def to_ist_str(dt: datetime.datetime) -> str:
    """Format any datetime as an IST ISO string with +05:30 offset."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Treat naive datetimes stored in DB as IST
        dt = dt.replace(tzinfo=IST)
    else:
        dt = dt.astimezone(IST)
    return dt.isoformat()
