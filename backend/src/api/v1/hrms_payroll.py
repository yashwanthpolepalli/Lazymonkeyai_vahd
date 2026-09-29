import calendar
import uuid
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc, and_, extract

from src.database.session import get_db
from src.models.hrms import (
    Employee,
    SalaryStructure,
    Payslip,
    PayslipTemplate,
    EmployeeLoan,
    SalaryAdvance,
    EmployeeBonus,
    SalesCommission,
    CommissionSlabPlan,
    PayGrade,
    EmployeeAttendance,
    LeaveRequest,
    Designation,
    Department
)
from src.models.gym_setting import GymSetting

router = APIRouter(prefix="/hrms/payroll", tags=["HRMS - Payroll & Compensation"])


def _escape_pdf_text(text: str) -> str:
    cleaned = (
        str(text)
        .replace("₹", "INR ")
        .replace("’", "'")
        .replace("‘", "'")
        .replace("“", '"')
        .replace("”", '"')
        .replace("–", "-")
        .replace("—", "-")
    )
    return cleaned.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')


def generate_payslip_pdf(
    slip: Payslip,
    emp: Employee,
    company_name: Optional[str] = None,
    desig_name: Optional[str] = None,
    dept_name: Optional[str] = None,
    template_config: Optional[dict] = None,
) -> bytes:
    """Pure Python PDF 1.4 generator for high-resolution salary slips."""
    month_names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    month_str = month_names[slip.month - 1] if 1 <= slip.month <= 12 else f"Month {slip.month}"
    
    cfg = template_config or {}
    hdr = cfg.get("header_config") or {}
    notes = cfg.get("notes_config") or {}
    
    title_text = hdr.get("title_text") or "OFFICIAL SALARY SLIP"
    subtitle_text = hdr.get("subtitle_text") or "CONFIDENTIAL PAYROLL CERTIFICATE"
    signatory_label = notes.get("signatory_label") or "Authorized Signatory"
    stamp_text = notes.get("stamp_text") or "[Digitally Verified Document]"
    
    basic = float(slip.basic_salary or 0.0)
    hra = float(slip.hra or 0.0)
    allow = float(slip.other_allowances or 0.0)
    gross = float(slip.gross_salary if slip.gross_salary is not None else (basic + hra + allow))
    
    pf = float(slip.pf_deduction or 0.0)
    esi = float(slip.esi_deduction or 0.0)
    tds = float(slip.tds_deduction or 0.0)
    other_ded = float(slip.other_deductions or 0.0)
    total_ded = pf + esi + tds + other_ded
    net = float(slip.net_salary if slip.net_salary is not None else (gross - total_ded))
    
    emp_name = f"{emp.first_name} {emp.last_name or ''}".strip()
    emp_code = emp.code or ""
    status_str = (slip.status or "PAID").upper()
    slip_ref = f"SLIP-{str(slip.id)[:8].upper()}" if slip.id else ""
    c_name = company_name or "Fitness Club Management"
    d_name = desig_name or ""
    dp_name = dept_name or ""
    
    lines = [
        ('F2', 18, 50, 790, c_name),
        ('F2', 8.5, 50, 774, f'{title_text} - {subtitle_text}'),
        ('LINE', 0, 50, 764, 545, 764),
        
        ('F2', 9.5, 50, 742, f'Employee Name: {emp_name}'),
        ('F1', 9, 50, 726, f'Employee Code: {emp_code}'),
        ('F1', 9, 50, 710, f'Designation: {d_name}'),
        ('F1', 9, 50, 694, f'Department: {dp_name}'),
        
        ('F2', 9.5, 360, 742, f'Pay Period: {month_str} {slip.year}'),
        ('F1', 9, 360, 726, f'Slip Ref No: {slip_ref}'),
        ('F1', 9, 360, 710, f'Disbursement Status: {status_str}'),
        ('F1', 9, 360, 694, f'Generated On: {date.today().strftime("%d %b %Y")}'),
        
        ('LINE', 0, 50, 680, 545, 680),
        ('F2', 11, 50, 660, f'Salary Statement for {month_str} {slip.year}'),
        
        # Table Header
        ('LINE', 0, 50, 645, 545, 645),
        ('F2', 9, 55, 632, 'Earnings Component'),
        ('F2', 9, 210, 632, 'Amount (INR)'),
        ('F2', 9, 320, 632, 'Deductions Component'),
        ('F2', 9, 470, 632, 'Amount (INR)'),
        ('LINE', 0, 50, 622, 545, 622),
        
        # Row 1
        ('F1', 8.5, 55, 608, 'Basic Salary'),
        ('F1', 8.5, 210, 608, f'INR {basic:,.2f}'),
        ('F1', 8.5, 320, 608, 'Provident Fund (PF)'),
        ('F1', 8.5, 470, 608, f'INR {pf:,.2f}'),
        
        # Row 2
        ('F1', 8.5, 55, 592, 'House Rent Allowance (HRA)'),
        ('F1', 8.5, 210, 592, f'INR {hra:,.2f}'),
        ('F1', 8.5, 320, 592, 'ESI Contribution'),
        ('F1', 8.5, 470, 592, f'INR {esi:,.2f}'),
        
        # Row 3
        ('F1', 8.5, 55, 576, 'Other Allowances'),
        ('F1', 8.5, 210, 576, f'INR {allow:,.2f}'),
        ('F1', 8.5, 320, 576, 'Tax Deducted at Source (TDS)'),
        ('F1', 8.5, 470, 576, f'INR {tds:,.2f}'),
        
        # Row 4
        ('F1', 8.5, 55, 560, '-'),
        ('F1', 8.5, 210, 560, '-'),
        ('F1', 8.5, 320, 560, 'Other Deductions'),
        ('F1', 8.5, 470, 560, f'INR {other_ded:,.2f}'),
        
        # Totals Row
        ('LINE', 0, 50, 548, 545, 548),
        ('F2', 9, 55, 534, 'Gross Earnings'),
        ('F2', 9, 210, 534, f'INR {gross:,.2f}'),
        ('F2', 9, 320, 534, 'Total Deductions'),
        ('F2', 9, 470, 534, f'INR {total_ded:,.2f}'),
        ('LINE', 0, 50, 522, 545, 522),
        
        # Net Pay Box
        ('F2', 12, 55, 498, f'NET TAKE-HOME PAY: INR {net:,.2f}'),
        ('LINE', 0, 50, 482, 545, 482),
        
        ('F1', 8, 50, 420, stamp_text),
        ('F2', 8.5, 360, 420, signatory_label),
        ('LINE', 0, 360, 440, 520, 440),
    ]

    stream_parts = ["BT"]
    for item in lines:
        if item[0] == 'LINE':
            _, w, x1, y1, x2, y2 = item
            stream_parts.append(f"ET\n0.8 0.8 0.8 RG\n{w or 0.5} w\n{x1} {y1} m {x2} {y2} l S\nBT")
        else:
            font_tag, font_size, x, y, text = item
            esc_text = _escape_pdf_text(text)
            stream_parts.append(f"/{font_tag} {font_size} Tf\n{x} {y} Td\n({esc_text}) Tj\n{-x} {-y} Td")
    stream_parts.append("ET")
    content_stream = "\n".join(stream_parts)

    objs = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> >>",
        f"<< /Length {len(content_stream.encode('latin1', 'replace'))} >>\nstream\n{content_stream}\nendstream"
    ]

    pdf = ["%PDF-1.4"]
    offsets = []
    curr_len = len(pdf[0]) + 1
    for i, obj in enumerate(objs, 1):
        offsets.append(curr_len)
        chunk = f"{i} 0 obj\n{obj}\nendobj\n"
        pdf.append(chunk)
        curr_len += len(chunk)

    xref_pos = curr_len
    xref = [f"xref\n0 {len(objs) + 1}\n0000000000 65535 f "]
    for off in offsets:
        xref.append(f"{off:010d} 00000 n ")
    pdf.append("\n".join(xref))
    pdf.append(f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF")
    return "\n".join(pdf).encode('latin1', 'replace')


# =====================================================================
# 1. SALARY STRUCTURES
# =====================================================================

@router.get("/structures")
def get_salary_structures(db: Session = Depends(get_db)):
    """List all mapped employee salary structures with live computations."""
    structs = db.query(SalaryStructure).all()
    employees = {e.id: e for e in db.query(Employee).all()}
    
    results = []
    for s in structs:
        emp = employees.get(s.employee_id)
        results.append({
            "id": s.id,
            "employee_id": s.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name or ''}".strip() if emp else None,
            "employee_code": emp.code if emp else None,
            "department": emp.department if emp else None,
            "designation": emp.designation if emp else None,
            "basic_salary": float(s.basic_salary) if s.basic_salary is not None else None,
            "hra": float(s.hra) if s.hra is not None else None,
            "other_allowances": float(s.other_allowances) if s.other_allowances is not None else None,
            "pf_deduction": float(s.pf_deduction) if s.pf_deduction is not None else None,
            "esi_deduction": float(s.esi_deduction) if s.esi_deduction is not None else None,
            "tds_deduction": float(s.tds_deduction) if s.tds_deduction is not None else None,
            "other_deductions": float(s.other_deductions) if s.other_deductions is not None else None,
            "gross_salary": float(s.gross_salary) if s.gross_salary is not None else None,
            "total_deductions": float(s.total_deductions) if s.total_deductions is not None else None,
            "net_salary": float(s.net_salary) if s.net_salary is not None else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None
        })
    return results


@router.post("/structures")
def save_salary_structure(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """Save or update employee salary structure with statutory formula calculation."""
    emp_id = payload.get("employee_id")
    if not emp_id:
        raise HTTPException(status_code=400, detail="Employee ID is required")
        
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    basic = float(payload.get("basic_salary") or 0.0)
    hra = float(payload.get("hra") or (basic * 0.40))
    other_allow = float(payload.get("other_allowances") or (basic * 0.10))
    pf = float(payload.get("pf_deduction") or (basic * 0.12))
    esi = float(payload.get("esi_deduction") or ((basic + hra + other_allow) * 0.0075 if (basic + hra + other_allow) <= 21000 else 0.0))
    tds = float(payload.get("tds_deduction") or 0.0)
    other_ded = float(payload.get("other_deductions") or 0.0)

    gross = basic + hra + other_allow
    total_ded = pf + esi + tds + other_ded
    net = gross - total_ded

    existing = db.query(SalaryStructure).filter(SalaryStructure.employee_id == emp_id).first()
    if existing:
        existing.basic_salary = basic
        existing.hra = hra
        existing.other_allowances = other_allow
        existing.pf_deduction = pf
        existing.esi_deduction = esi
        existing.tds_deduction = tds
        existing.other_deductions = other_ded
        existing.gross_salary = gross
        existing.total_deductions = total_ded
        existing.net_salary = net
        struct = existing
    else:
        struct = SalaryStructure(
            employee_id=emp_id,
            basic_salary=basic,
            hra=hra,
            other_allowances=other_allow,
            pf_deduction=pf,
            esi_deduction=esi,
            tds_deduction=tds,
            other_deductions=other_ded,
            gross_salary=gross,
            total_deductions=total_ded,
            net_salary=net
        )
        db.add(struct)

    # Sync base salary to Employee record
    emp.salary = gross
    db.commit()
    db.refresh(struct)
    return {"message": "Salary structure configured successfully", "structure_id": struct.id, "net_salary": net}


@router.delete("/structures/{id}")
def delete_salary_structure(id: str, db: Session = Depends(get_db)):
    struct = db.query(SalaryStructure).filter(SalaryStructure.id == id).first()
    if not struct:
        raise HTTPException(status_code=404, detail="Salary structure not found")
    db.delete(struct)
    db.commit()
    return {"message": "Salary structure removed"}


# =====================================================================
# 2. MONTHLY PAYROLL PROCESSING
# =====================================================================

@router.get("/processing")
def get_monthly_processing(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    department: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Retrieve day-wise monthly payroll processing grid with attendance sync."""
    employees = db.query(Employee).filter(Employee.status == "Active").all()
    if department and department != "All Departments":
        employees = [e for e in employees if e.department == department]

    structs = {s.employee_id: s for s in db.query(SalaryStructure).all()}
    payslips = {p.employee_id: p for p in db.query(Payslip).filter(Payslip.month == month, Payslip.year == year).all()}

    # Calculate actual calendar days for given month and year
    days_in_month = calendar.monthrange(year, month)[1]

    items = []
    total_staff = len(employees)
    gross_payroll = 0.0
    statutory_deductions = 0.0
    net_disbursable = 0.0
    disbursed_count = 0

    for emp in employees:
        struct = structs.get(emp.id)
        slip = payslips.get(emp.id)

        basic = float(struct.basic_salary if (struct and struct.basic_salary is not None) else (emp.salary or 0.0))
        hra = float(struct.hra if (struct and struct.hra is not None) else basic * 0.4)
        allow = float(struct.other_allowances if (struct and struct.other_allowances is not None) else basic * 0.1)
        gross = basic + hra + allow

        pf = float(struct.pf_deduction if (struct and struct.pf_deduction is not None) else basic * 0.12)
        esi = float(struct.esi_deduction if (struct and struct.esi_deduction is not None) else (gross * 0.0075 if gross <= 21000 else 0.0))
        tds = float(struct.tds_deduction if (struct and struct.tds_deduction is not None) else 0.0)
        stat_ded = pf + esi + tds
        net_pay = gross - stat_ded

        # Dynamically query attendance and leave records for this employee for the month
        att_records = db.query(EmployeeAttendance).filter(
            EmployeeAttendance.employee_id == emp.id,
            extract('month', EmployeeAttendance.date) == month,
            extract('year', EmployeeAttendance.date) == year
        ).all()
        
        present_count = sum(1 for a in att_records if a.status in ["Present", "Late", "Half Day"])
        
        leave_records = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == emp.id,
            LeaveRequest.status == "Approved",
            extract('month', LeaveRequest.start_date) == month,
            extract('year', LeaveRequest.start_date) == year
        ).all()
        paid_leaves = sum(l.days or 0 for l in leave_records if l.is_paid or l.paid_type == "PAID")
        unpaid_leaves = sum(l.days or 0 for l in leave_records if not l.is_paid and l.paid_type == "UNPAID")

        worked_days = float(present_count) if att_records else float(days_in_month - unpaid_leaves)
        lop_days = float(unpaid_leaves)
        payable_days = float(slip.payable_days if (slip and slip.payable_days is not None) else max(0.0, days_in_month - lop_days))

        current_status = slip.status if slip else "Pending"
        if current_status == "Paid":
            disbursed_count += 1

        gross_payroll += gross
        statutory_deductions += stat_ded
        net_disbursable += net_pay

        if status_filter and status_filter != "All":
            if status_filter == "Pending" and current_status == "Paid":
                continue
            if status_filter == "Disbursed" and current_status != "Paid":
                continue

        items.append({
            "employee_id": emp.id,
            "employee_name": f"{emp.first_name} {emp.last_name or ''}".strip(),
            "employee_code": emp.code,
            "department": emp.department,
            "designation": emp.designation,
            "month_days": days_in_month,
            "work_days": worked_days,
            "leaves_pl": paid_leaves,
            "lop_days": lop_days,
            "payable_days": payable_days,
            "base_ctc": basic,
            "gross_earnings": gross,
            "statutory_deductions": stat_ded,
            "net_payout": net_pay,
            "status": current_status,
            "payslip_id": slip.id if slip else None,
            "payment_method": slip.payment_method if slip else None,
            "disbursed_at": slip.disbursed_at.isoformat() if (slip and slip.disbursed_at) else None
        })

    return {
        "month": month,
        "year": year,
        "metrics": {
            "total_staff": total_staff,
            "gross_payroll": gross_payroll,
            "statutory_deductions": statutory_deductions,
            "net_disbursable": net_disbursable,
            "disbursed_count": disbursed_count,
            "pending_count": total_staff - disbursed_count
        },
        "employees": items
    }


@router.post("/disburse-batch")
def disburse_batch_payroll(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """1-Click compliant batch disbursement of pending employee payroll."""
    month = int(payload.get("month") or datetime.utcnow().month)
    year = int(payload.get("year") or datetime.utcnow().year)
    employee_ids = payload.get("employee_ids", [])
    payment_method = payload.get("payment_method")

    employees = db.query(Employee).filter(Employee.status == "Active").all()
    if employee_ids:
        employees = [e for e in employees if e.id in employee_ids]

    structs = {s.employee_id: s for s in db.query(SalaryStructure).all()}
    days_in_month = calendar.monthrange(year, month)[1]
    count = 0

    for emp in employees:
        struct = structs.get(emp.id)
        basic = float(struct.basic_salary if (struct and struct.basic_salary is not None) else (emp.salary or 0.0))
        hra = float(struct.hra if (struct and struct.hra is not None) else basic * 0.4)
        allow = float(struct.other_allowances if (struct and struct.other_allowances is not None) else basic * 0.1)
        gross = basic + hra + allow
        pf = float(struct.pf_deduction if (struct and struct.pf_deduction is not None) else basic * 0.12)
        esi = float(struct.esi_deduction if (struct and struct.esi_deduction is not None) else (gross * 0.0075 if gross <= 21000 else 0.0))
        tds = float(struct.tds_deduction if (struct and struct.tds_deduction is not None) else 0.0)
        total_ded = pf + esi + tds
        net = gross - total_ded

        slip = db.query(Payslip).filter(Payslip.employee_id == emp.id, Payslip.month == month, Payslip.year == year).first()
        if not slip:
            slip = Payslip(
                employee_id=emp.id,
                month=month,
                year=year,
                pay_period=f"{year}-{month:02d}",
                basic_salary=basic,
                hra=hra,
                other_allowances=allow,
                gross_salary=gross,
                pf_deduction=pf,
                esi_deduction=esi,
                tds_deduction=tds,
                total_deductions=total_ded,
                net_salary=net,
                payable_days=float(days_in_month),
                status="Paid",
                payment_method=payment_method,
                transaction_ref=f"TXN-{uuid.uuid4().hex[:10].upper()}",
                disbursed_at=datetime.utcnow()
            )
            db.add(slip)
        else:
            slip.status = "Paid"
            if payment_method:
                slip.payment_method = payment_method
            slip.transaction_ref = f"TXN-{uuid.uuid4().hex[:10].upper()}"
            slip.disbursed_at = datetime.utcnow()
        count += 1

    db.commit()
    return {"message": f"Successfully disbursed batch payroll for {count} employee(s)", "disbursed_count": count}


@router.post("/disburse-single")
def disburse_single_employee(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """Disburse salary for a single employee."""
    emp_id = payload.get("employee_id")
    month = int(payload.get("month") or datetime.utcnow().month)
    year = int(payload.get("year") or datetime.utcnow().year)
    method = payload.get("payment_method")
    txn_ref = payload.get("transaction_ref") or f"TXN-{uuid.uuid4().hex[:10].upper()}"

    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    struct = db.query(SalaryStructure).filter(SalaryStructure.employee_id == emp_id).first()
    basic = float(struct.basic_salary if (struct and struct.basic_salary is not None) else (emp.salary or 0.0))
    hra = float(struct.hra if (struct and struct.hra is not None) else basic * 0.4)
    allow = float(struct.other_allowances if (struct and struct.other_allowances is not None) else basic * 0.1)
    gross = basic + hra + allow
    pf = float(struct.pf_deduction if (struct and struct.pf_deduction is not None) else basic * 0.12)
    esi = float(struct.esi_deduction if (struct and struct.esi_deduction is not None) else (gross * 0.0075 if gross <= 21000 else 0.0))
    tds = float(struct.tds_deduction if (struct and struct.tds_deduction is not None) else 0.0)
    total_ded = pf + esi + tds
    net = gross - total_ded

    days_in_month = calendar.monthrange(year, month)[1]
    slip = db.query(Payslip).filter(Payslip.employee_id == emp_id, Payslip.month == month, Payslip.year == year).first()
    if not slip:
        slip = Payslip(
            employee_id=emp_id,
            month=month,
            year=year,
            pay_period=f"{year}-{month:02d}",
            basic_salary=basic,
            hra=hra,
            other_allowances=allow,
            gross_salary=gross,
            pf_deduction=pf,
            esi_deduction=esi,
            tds_deduction=tds,
            total_deductions=total_ded,
            net_salary=net,
            payable_days=float(days_in_month),
            status="Paid",
            payment_method=method,
            transaction_ref=txn_ref,
            disbursed_at=datetime.utcnow()
        )
        db.add(slip)
    else:
        slip.status = "Paid"
        if method:
            slip.payment_method = method
        slip.transaction_ref = txn_ref
        slip.disbursed_at = datetime.utcnow()

    db.commit()
    return {"message": f"Salary disbursed to {emp.first_name} successfully", "slip_id": slip.id}


# =====================================================================
# 3. STATUTORY COMPLIANCE (PF, ESI, TDS)
# =====================================================================

@router.get("/statutory/pf")
def get_statutory_pf_report(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    db: Session = Depends(get_db)
):
    """Get EPFO monthly statutory PF contribution report with ECR metrics."""
    employees = db.query(Employee).filter(Employee.status == "Active").all()
    structs = {s.employee_id: s for s in db.query(SalaryStructure).all()}

    rows = []
    tot_wages = 0.0
    tot_ee_pf = 0.0
    tot_er_pf = 0.0
    tot_eps = 0.0

    for emp in employees:
        struct = structs.get(emp.id)
        basic = float(struct.basic_salary if struct else (emp.salary or 0.0))
        pf_wage = min(basic, 15000.0)
        ee_pf = round(pf_wage * 0.12, 2)
        eps = round(pf_wage * 0.0833, 2)
        er_pf = round(pf_wage * 0.0367, 2)

        tot_wages += pf_wage
        tot_ee_pf += ee_pf
        tot_er_pf += er_pf
        tot_eps += eps

        rows.append({
            "employee_id": emp.id,
            "employee_name": f"{emp.first_name} {emp.last_name or ''}".strip(),
            "employee_code": emp.code,
            "pf_wages": pf_wage,
            "employee_share_12": ee_pf,
            "employer_pf_3_67": er_pf,
            "employer_eps_8_33": eps,
            "total_pf_contribution": round(ee_pf + er_pf + eps, 2)
        })

    return {
        "month": month,
        "year": year,
        "summary": {
            "total_employees": len(employees),
            "total_pf_wages": tot_wages,
            "total_employee_pf": tot_ee_pf,
            "total_employer_pf": tot_er_pf,
            "total_eps": tot_eps,
            "total_challan_amount": round(tot_ee_pf + tot_er_pf + tot_eps, 2)
        },
        "records": rows
    }


@router.get("/statutory/esi")
def get_statutory_esi_report(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    db: Session = Depends(get_db)
):
    """Get ESIC monthly contribution report (Employee 0.75% / Employer 3.25%)."""
    employees = db.query(Employee).filter(Employee.status == "Active").all()
    structs = {s.employee_id: s for s in db.query(SalaryStructure).all()}

    rows = []
    tot_wages = 0.0
    tot_ee_esi = 0.0
    tot_er_esi = 0.0

    for emp in employees:
        struct = structs.get(emp.id)
        basic = float(struct.basic_salary if struct else (emp.salary or 0.0))
        gross = float(struct.gross_salary if struct else basic * 1.5)
        
        is_eligible = gross <= 21000.0
        ee_esi = round(gross * 0.0075, 2) if is_eligible else 0.0
        er_esi = round(gross * 0.0325, 2) if is_eligible else 0.0

        if is_eligible:
            tot_wages += gross
            tot_ee_esi += ee_esi
            tot_er_esi += er_esi

        rows.append({
            "employee_id": emp.id,
            "employee_name": f"{emp.first_name} {emp.last_name or ''}".strip(),
            "employee_code": emp.code,
            "gross_wages": gross,
            "is_eligible": is_eligible,
            "employee_share_0_75": ee_esi,
            "employer_share_3_25": er_esi,
            "total_esi_contribution": round(ee_esi + er_esi, 2)
        })

    return {
        "month": month,
        "year": year,
        "summary": {
            "eligible_headcount": len([r for r in rows if r["is_eligible"]]),
            "total_covered_wages": tot_wages,
            "total_employee_esi": tot_ee_esi,
            "total_employer_esi": tot_er_esi,
            "total_challan_amount": round(tot_ee_esi + tot_er_esi, 2)
        },
        "records": rows
    }


@router.get("/statutory/tds")
def get_statutory_tds_report(
    year: int = Query(..., ge=2000, le=2100),
    db: Session = Depends(get_db)
):
    """Get Section 192 TDS annual tax projection and quarterly deduction matrix."""
    employees = db.query(Employee).filter(Employee.status == "Active").all()
    structs = {s.employee_id: s for s in db.query(SalaryStructure).all()}

    rows = []
    tot_projected_tax = 0.0

    for emp in employees:
        struct = structs.get(emp.id)
        basic = float(struct.basic_salary if struct else (emp.salary or 0.0))
        gross = float(struct.gross_salary if struct else basic * 1.5)
        annual_gross = gross * 12.0
        
        # New Tax Regime Standard Slab Approximation
        taxable = max(0.0, annual_gross - 75000.0)  # Standard Deduction 75k
        annual_tax = 0.0
        if taxable > 700000.0:
            if taxable <= 1000000.0:
                annual_tax = (taxable - 700000.0) * 0.10
            elif taxable <= 1200000.0:
                annual_tax = 30000.0 + (taxable - 1000000.0) * 0.15
            elif taxable <= 1500000.0:
                annual_tax = 60000.0 + (taxable - 1200000.0) * 0.20
            else:
                annual_tax = 120000.0 + (taxable - 1500000.0) * 0.30

        monthly_tds = round(annual_tax / 12.0, 2)
        tot_projected_tax += annual_tax

        rows.append({
            "employee_id": emp.id,
            "employee_name": f"{emp.first_name} {emp.last_name or ''}".strip(),
            "employee_code": emp.code,
            "annual_gross_salary": annual_gross,
            "taxable_income": taxable,
            "annual_tds_liability": round(annual_tax, 2),
            "monthly_tds_deduction": monthly_tds
        })

    return {
        "year": year,
        "summary": {
            "total_taxable_staff": len([r for r in rows if r["annual_tds_liability"] > 0]),
            "total_projected_tax": round(tot_projected_tax, 2)
        },
        "records": rows
    }


# =====================================================================
# 4. PAYSLIPS & DISBURSAL ARCHIVE
# =====================================================================

@router.get("/payslips")
def get_payslips_archive(
    month: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Retrieve historical payslip archive with search and month-wise filtering."""
    query = db.query(Payslip).order_by(Payslip.year.desc(), Payslip.month.desc())
    if year:
        query = query.filter(Payslip.year == year)
    if month and month != "all" and month.isdigit():
        query = query.filter(Payslip.month == int(month))

    slips = query.all()
    employees = {e.id: e for e in db.query(Employee).all()}

    results = []
    tot_gross = 0.0
    tot_ded = 0.0
    tot_net = 0.0

    for s in slips:
        emp = employees.get(s.employee_id)
        emp_name = f"{emp.first_name} {emp.last_name or ''}".strip() if emp else None
        emp_code = emp.code if emp else None

        if search and emp_name:
            s_low = search.strip().lower()
            if s_low not in emp_name.lower() and (not emp_code or s_low not in emp_code.lower()):
                continue

        gross = float(s.gross_salary) if s.gross_salary is not None else 0.0
        ded = float(s.total_deductions) if s.total_deductions is not None else 0.0
        net = float(s.net_salary) if s.net_salary is not None else 0.0

        tot_gross += gross
        tot_ded += ded
        tot_net += net

        results.append({
            "id": s.id,
            "employee_id": s.employee_id,
            "employee_name": emp_name,
            "employee_code": emp_code,
            "month": s.month,
            "year": s.year,
            "period": f"{s.year}-{s.month:02d}",
            "basic_salary": float(s.basic_salary) if s.basic_salary is not None else None,
            "gross_salary": gross,
            "deductions": ded,
            "net_pay": net,
            "status": s.status,
            "payment_method": s.payment_method,
            "transaction_ref": s.transaction_ref,
            "disbursed_at": s.disbursed_at.isoformat() if s.disbursed_at else None
        })

    return {
        "summary": {
            "filtered_count": len(results),
            "total_gross_salary": tot_gross,
            "total_deductions": tot_ded,
            "net_disbursed_payout": tot_net
        },
        "payslips": results
    }


@router.get("/payslips/{id}/pdf")
def download_payslip_pdf(id: str, db: Session = Depends(get_db)):
    """Generate high-resolution official vector PDF salary slip."""
    slip = db.query(Payslip).filter(Payslip.id == id).first()
    if not slip:
        raise HTTPException(status_code=404, detail="Payslip record not found")

    emp = db.query(Employee).filter(Employee.id == slip.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    settings = db.query(GymSetting).first()
    gym_name = settings.gym_name if (settings and settings.gym_name) else None

    tmpl = db.query(PayslipTemplate).filter(PayslipTemplate.is_default == True).first()
    cfg = {
        "header_config": tmpl.header_config if tmpl else {},
        "notes_config": tmpl.notes_config if tmpl else {},
        "styling_config": tmpl.styling_config if tmpl else {}
    }

    pdf_bytes = generate_payslip_pdf(
        slip=slip,
        emp=emp,
        company_name=gym_name,
        desig_name=emp.designation,
        dept_name=emp.department,
        template_config=cfg
    )

    filename = f"payslip_{emp.code or 'EMP'}_{slip.year}_{slip.month:02d}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# =====================================================================
# 5. PAYSLIP TEMPLATE STUDIO
# =====================================================================

@router.get("/templates")
def get_payslip_templates(db: Session = Depends(get_db)):
    """List all corporate design templates in Payslip Template Studio."""
    tmpls = db.query(PayslipTemplate).order_by(PayslipTemplate.created_at.desc()).all()
    if not tmpls:
        # Seed 6 standard design presets
        presets = [
            {"name": "Modern Corporate", "desc": "Deep indigo & navy styling with high-contrast breakdown grid.", "color": "#1e3a8a", "default": True},
            {"name": "Executive Sapphire", "desc": "Royal sapphire theme with highlighted earnings and banner.", "color": "#0284c7", "default": False},
            {"name": "Emerald Clean", "desc": "Eco emerald accents, clean whitespace design & modern indicators.", "color": "#059669", "default": False},
            {"name": "Monochrome Minimal", "desc": "Classic black and dark slate legal styling for thermal/laser.", "color": "#1e293b", "default": False},
            {"name": "Tech Violet", "desc": "Futuristic purple-indigo tones with pill badges.", "color": "#7c3aed", "default": False},
            {"name": "Compact Legal Voucher", "desc": "High-density single-column voucher layout for paper savings.", "color": "#475569", "default": False},
        ]
        for p in presets:
            db.add(PayslipTemplate(
                name=p["name"],
                description=p["desc"],
                theme_color=p["color"],
                is_default=p["default"],
                header_config={"title_text": "SALARY CERTIFICATE & DISBURSAL SLIP", "subtitle_text": "CONFIDENTIAL HRMS RECORD"},
                notes_config={"signatory_label": "Authorized Signatory", "stamp_text": "[Digitally Verified]"}
            ))
        db.commit()
        tmpls = db.query(PayslipTemplate).all()

    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "theme_color": t.theme_color,
            "is_default": t.is_default,
            "header_config": t.header_config or {},
            "notes_config": t.notes_config or {},
            "styling_config": t.styling_config or {}
        }
        for t in tmpls
    ]


@router.post("/templates")
def create_payslip_template(payload: Dict[str, Any], db: Session = Depends(get_db)):
    tmpl = PayslipTemplate(
        name=payload.get("name"),
        description=payload.get("description"),
        theme_color=payload.get("theme_color"),
        is_default=bool(payload.get("is_default", False)),
        header_config=payload.get("header_config", {}),
        notes_config=payload.get("notes_config", {}),
        styling_config=payload.get("styling_config", {})
    )
    db.add(tmpl)
    db.commit()
    db.refresh(tmpl)
    return {"id": tmpl.id, "message": "Template created successfully"}


@router.put("/templates/{id}")
def update_payslip_template(id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    tmpl = db.query(PayslipTemplate).filter(PayslipTemplate.id == id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")

    if "name" in payload: tmpl.name = payload["name"]
    if "description" in payload: tmpl.description = payload["description"]
    if "theme_color" in payload: tmpl.theme_color = payload["theme_color"]
    if "header_config" in payload: tmpl.header_config = payload["header_config"]
    if "notes_config" in payload: tmpl.notes_config = payload["notes_config"]
    if "styling_config" in payload: tmpl.styling_config = payload["styling_config"]

    db.commit()
    return {"message": "Template updated successfully"}


@router.post("/templates/{id}/set-default")
def set_default_template(id: str, db: Session = Depends(get_db)):
    db.query(PayslipTemplate).update({PayslipTemplate.is_default: False})
    tmpl = db.query(PayslipTemplate).filter(PayslipTemplate.id == id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    tmpl.is_default = True
    db.commit()
    return {"message": f"'{tmpl.name}' set as active organization default payslip template"}


# =====================================================================
# 6. LOANS, ADVANCES, BONUSES & COMMISSIONS
# =====================================================================

@router.get("/loans")
def get_loans(db: Session = Depends(get_db)):
    loans = db.query(EmployeeLoan).order_by(EmployeeLoan.created_at.desc()).all()
    employees = {e.id: e for e in db.query(Employee).all()}
    return [
        {
            "id": l.id,
            "employee_id": l.employee_id,
            "employee_name": f"{employees[l.employee_id].first_name} {employees[l.employee_id].last_name or ''}".strip() if l.employee_id in employees else None,
            "loan_type": l.loan_type,
            "principal_amount": l.principal_amount,
            "interest_rate": l.interest_rate,
            "tenure_months": l.tenure_months,
            "monthly_emi": l.monthly_emi,
            "paid_amount": l.paid_amount,
            "remaining_amount": l.remaining_amount,
            "reason": l.reason,
            "status": l.status
        }
        for l in loans
    ]


@router.post("/loans")
def create_loan(payload: Dict[str, Any], db: Session = Depends(get_db)):
    principal = float(payload.get("principal_amount") or 0.0)
    tenure = int(payload.get("tenure_months") or 1)
    interest = float(payload.get("interest_rate") or 0.0)
    emi = round((principal * (1 + (interest / 100))) / max(1, tenure), 2)

    loan = EmployeeLoan(
        employee_id=payload.get("employee_id"),
        loan_type=payload.get("loan_type"),
        principal_amount=principal,
        interest_rate=interest,
        tenure_months=tenure,
        monthly_emi=emi,
        remaining_amount=principal,
        start_month=int(payload.get("start_month")) if payload.get("start_month") else None,
        start_year=int(payload.get("start_year")) if payload.get("start_year") else None,
        reason=payload.get("reason"),
        status="Active"
    )
    db.add(loan)
    db.commit()
    return {"message": "Loan applied successfully", "loan_id": loan.id, "monthly_emi": emi}


@router.get("/advances")
def get_advances(db: Session = Depends(get_db)):
    advs = db.query(SalaryAdvance).order_by(SalaryAdvance.created_at.desc()).all()
    employees = {e.id: e for e in db.query(Employee).all()}
    return [
        {
            "id": a.id,
            "employee_id": a.employee_id,
            "employee_name": f"{employees[a.employee_id].first_name} {employees[a.employee_id].last_name or ''}".strip() if a.employee_id in employees else None,
            "amount": a.amount,
            "month": a.month,
            "year": a.year,
            "reason": a.reason,
            "status": a.status
        }
        for a in advs
    ]


@router.post("/advances")
def create_advance(payload: Dict[str, Any], db: Session = Depends(get_db)):
    adv = SalaryAdvance(
        employee_id=payload.get("employee_id"),
        amount=float(payload.get("amount") or 0.0),
        month=int(payload.get("month")) if payload.get("month") else None,
        year=int(payload.get("year")) if payload.get("year") else None,
        reason=payload.get("reason"),
        status="Pending"
    )
    db.add(adv)
    db.commit()
    return {"message": "Salary advance recorded", "advance_id": adv.id}


@router.get("/bonuses")
def get_bonuses(db: Session = Depends(get_db)):
    bons = db.query(EmployeeBonus).order_by(EmployeeBonus.created_at.desc()).all()
    employees = {e.id: e for e in db.query(Employee).all()}
    return [
        {
            "id": b.id,
            "employee_id": b.employee_id,
            "employee_name": f"{employees[b.employee_id].first_name} {employees[b.employee_id].last_name or ''}".strip() if b.employee_id in employees else None,
            "title": b.title,
            "bonus_type": b.bonus_type,
            "amount": b.amount,
            "month": b.month,
            "year": b.year,
            "remarks": b.remarks,
            "status": b.status
        }
        for b in bons
    ]


@router.post("/bonuses")
def create_bonus(payload: Dict[str, Any], db: Session = Depends(get_db)):
    b = EmployeeBonus(
        employee_id=payload.get("employee_id"),
        title=payload.get("title"),
        bonus_type=payload.get("bonus_type"),
        amount=float(payload.get("amount") or 0.0),
        month=int(payload.get("month")) if payload.get("month") else None,
        year=int(payload.get("year")) if payload.get("year") else None,
        remarks=payload.get("remarks"),
        status="Pending"
    )
    db.add(b)
    db.commit()
    return {"message": "Bonus mapped to employee", "bonus_id": b.id}


@router.get("/commissions")
def get_commissions(db: Session = Depends(get_db)):
    comms = db.query(SalesCommission).order_by(SalesCommission.created_at.desc()).all()
    employees = {e.id: e for e in db.query(Employee).all()}
    return [
        {
            "id": c.id,
            "employee_id": c.employee_id,
            "employee_name": f"{employees[c.employee_id].first_name} {employees[c.employee_id].last_name or ''}".strip() if c.employee_id in employees else None,
            "month": c.month,
            "year": c.year,
            "target_quota": c.target_quota,
            "achieved_volume": c.achieved_volume,
            "commission_rate": c.commission_rate,
            "commission_mode": c.commission_mode,
            "total_commission": c.total_commission,
            "status": c.status
        }
        for c in comms
    ]


@router.post("/commissions")
def create_commission(payload: Dict[str, Any], db: Session = Depends(get_db)):
    achieved = float(payload.get("achieved_volume") or 0.0)
    rate = float(payload.get("commission_rate") or 0.0)
    mode = payload.get("commission_mode")
    
    total = round(achieved * (rate / 100.0), 2)
    comm = SalesCommission(
        employee_id=payload.get("employee_id"),
        month=int(payload.get("month")) if payload.get("month") else None,
        year=int(payload.get("year")) if payload.get("year") else None,
        target_quota=float(payload.get("target_quota") or 0.0),
        achieved_volume=achieved,
        commission_rate=rate,
        commission_mode=mode,
        total_commission=total,
        notes=payload.get("notes"),
        status="Pending"
    )
    db.add(comm)
    db.commit()
    return {"message": "Commission recorded", "commission_id": comm.id, "total_commission": total}

