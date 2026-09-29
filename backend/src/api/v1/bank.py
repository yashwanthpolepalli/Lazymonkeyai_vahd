import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import desc

from src.database.session import get_db
from src.utils.timezone import now_ist_naive

router = APIRouter(prefix="/bank", tags=["Banking & Reconciliation"])

# In-memory default bank accounts for standard cash/bank management
DEFAULT_BANK_ACCOUNTS = [
    {
        "id": "bank_acc_01",
        "account_name": "Main Operating Current Account",
        "account_number": "50200049281742",
        "bank_name": "HDFC Bank",
        "branch_name": "Indiranagar, Bangalore",
        "ifsc_code": "HDFC0001234",
        "account_type": "CURRENT",
        "opening_balance": 150000.0,
        "current_balance": 284500.0,
        "currency": "INR",
        "status": "active",
        "is_default": True,
        "created_at": "2026-01-01T00:00:00",
    },
    {
        "id": "bank_acc_02",
        "account_name": "POS Counter Cash Drawer",
        "account_number": "CASH-MAIN",
        "bank_name": "Physical Petty Cash",
        "branch_name": "Store Front",
        "ifsc_code": "CASH000",
        "account_type": "SAVINGS",
        "opening_balance": 10000.0,
        "current_balance": 18200.0,
        "currency": "INR",
        "status": "active",
        "is_default": False,
        "created_at": "2026-01-01T00:00:00",
    },
    {
        "id": "bank_acc_03",
        "account_name": "UPI & Razorpay Settlement Account",
        "account_number": "91802938472910",
        "bank_name": "ICICI Bank",
        "branch_name": "Koramangala, Bangalore",
        "ifsc_code": "ICIC0000987",
        "account_type": "CURRENT",
        "opening_balance": 50000.0,
        "current_balance": 142000.0,
        "currency": "INR",
        "status": "active",
        "is_default": False,
        "created_at": "2026-01-01T00:00:00",
    }
]

_bank_accounts = list(DEFAULT_BANK_ACCOUNTS)
_bank_transactions: List[Dict[str, Any]] = []


@router.get("/accounts")
def list_bank_accounts(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    items = _bank_accounts
    if status and status.lower() != "all":
        items = [a for a in items if a.get("status", "").lower() == status.lower()]
    if search:
        s = search.lower()
        items = [
            a for a in items
            if s in a.get("account_name", "").lower()
            or s in a.get("bank_name", "").lower()
            or s in a.get("account_number", "").lower()
        ]

    total = len(items)
    start = (page - 1) * page_size
    paged = items[start:start + page_size]

    return {
        "items": paged,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/accounts/{account_id}")
def get_bank_account(account_id: str):
    acc = next((a for a in _bank_accounts if a["id"] == account_id), None)
    if not acc:
        raise HTTPException(status_code=404, detail="Bank account not found")
    return acc


@router.post("/accounts", status_code=status.HTTP_201_CREATED)
def create_bank_account(payload: Dict[str, Any] = Body(...)):
    new_acc = {
        "id": f"bank_acc_{uuid.uuid4().hex[:6]}",
        "account_name": payload.get("account_name", "New Bank Account"),
        "account_number": payload.get("account_number", ""),
        "bank_name": payload.get("bank_name", "Bank"),
        "branch_name": payload.get("branch_name", ""),
        "ifsc_code": payload.get("ifsc_code", ""),
        "account_type": payload.get("account_type", "CURRENT"),
        "opening_balance": float(payload.get("opening_balance", 0.0)),
        "current_balance": float(payload.get("opening_balance", 0.0)),
        "currency": payload.get("currency", "INR"),
        "status": payload.get("status", "active"),
        "is_default": bool(payload.get("is_default", False)),
        "created_at": now_ist_naive().isoformat(),
    }
    if new_acc["is_default"]:
        for a in _bank_accounts:
            a["is_default"] = False
    _bank_accounts.append(new_acc)
    return new_acc


@router.patch("/accounts/{account_id}")
def update_bank_account(account_id: str, payload: Dict[str, Any] = Body(...)):
    acc = next((a for a in _bank_accounts if a["id"] == account_id), None)
    if not acc:
        raise HTTPException(status_code=404, detail="Bank account not found")
    acc.update(payload)
    return acc


@router.delete("/accounts/{account_id}")
def delete_bank_account(account_id: str):
    global _bank_accounts
    _bank_accounts = [a for a in _bank_accounts if a["id"] != account_id]
    return {"message": "Bank account deleted successfully"}


@router.get("/accounts/{account_id}/transactions")
def list_account_transactions(
    account_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    txs = [t for t in _bank_transactions if t.get("bank_account_id") == account_id]
    total = len(txs)
    start = (page - 1) * page_size
    paged = txs[start:start + page_size]
    return {
        "items": paged,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/accounts/{account_id}/transactions", status_code=status.HTTP_201_CREATED)
def create_account_transaction(account_id: str, payload: Dict[str, Any] = Body(...)):
    acc = next((a for a in _bank_accounts if a["id"] == account_id), None)
    if not acc:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    amount = float(payload.get("amount", 0.0))
    tx_type = payload.get("transaction_type", "CREDIT").upper()
    
    if tx_type == "CREDIT":
        acc["current_balance"] += amount
    else:
        acc["current_balance"] -= amount

    tx = {
        "id": f"btx_{uuid.uuid4().hex[:8]}",
        "bank_account_id": account_id,
        "transaction_date": payload.get("transaction_date") or now_ist_naive().strftime("%Y-%m-%d"),
        "transaction_type": tx_type,
        "amount": amount,
        "balance_after": acc["current_balance"],
        "reference_number": payload.get("reference_number", ""),
        "description": payload.get("description", ""),
        "created_at": now_ist_naive().isoformat(),
    }
    _bank_transactions.append(tx)
    return tx


@router.get("/transactions")
def list_all_bank_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    transaction_type: Optional[str] = Query(None),
):
    txs = _bank_transactions
    if transaction_type:
        txs = [t for t in txs if t.get("transaction_type", "").upper() == transaction_type.upper()]
    total = len(txs)
    start = (page - 1) * page_size
    paged = txs[start:start + page_size]
    return {
        "items": paged,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/reconciliations")
def create_reconciliation(payload: Dict[str, Any] = Body(...)):
    return {
        "id": f"rec_{uuid.uuid4().hex[:8]}",
        "status": "IN_PROGRESS",
        "statement_balance": payload.get("statement_balance", 0.0),
        "book_balance": payload.get("book_balance", 0.0),
        "created_at": now_ist_naive().isoformat(),
    }


@router.post("/reconciliations/{rec_id}/complete")
def complete_reconciliation(rec_id: str):
    return {"id": rec_id, "status": "COMPLETED", "message": "Bank reconciliation completed successfully"}
