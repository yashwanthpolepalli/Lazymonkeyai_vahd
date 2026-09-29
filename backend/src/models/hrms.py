import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Date, Text, ForeignKey, JSON
from src.database import Base

class Employee(Base):
    __tablename__ = "hrms_employees"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"emp_{uuid.uuid4().hex[:8]}")
    code = Column(String, nullable=False, unique=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=True)
    email = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    marital_status = Column(String, nullable=True)
    probation_status = Column(String, nullable=True)
    designation = Column(String, nullable=False)
    department = Column(String, nullable=False)
    reporting_manager = Column(String, nullable=True)
    joined_date = Column(Date, nullable=True)
    employment_type = Column(String, nullable=True)
    status = Column(String, nullable=True)
    salary = Column(Float, nullable=True)
    avatar = Column(String, nullable=True)
    gym_branch = Column(String, nullable=True)
    address = Column(String, nullable=True)
    emergency_contact = Column(String, nullable=True)
    skills = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Department(Base):
    __tablename__ = "hrms_departments"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"dept_{uuid.uuid4().hex[:8]}")
    name = Column(String, nullable=False, unique=True)
    code = Column(String, nullable=False)
    description = Column(String, nullable=True)
    head_name = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Designation(Base):
    __tablename__ = "hrms_designations"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"desg_{uuid.uuid4().hex[:8]}")
    title = Column(String, nullable=False)
    department = Column(String, nullable=False)
    level = Column(String, nullable=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Team(Base):
    __tablename__ = "hrms_teams"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"team_{uuid.uuid4().hex[:8]}")
    name = Column(String, nullable=False)
    department = Column(String, nullable=False)
    lead_name = Column(String, nullable=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class EmployeeDocument(Base):
    __tablename__ = "hrms_documents"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"doc_{uuid.uuid4().hex[:8]}")
    employee_id = Column(String, ForeignKey("hrms_employees.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    doc_type = Column(String, nullable=True)
    file_url = Column(String, nullable=True)
    file_size = Column(String, nullable=True)
    status = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

class EmployeeAttendance(Base):
    __tablename__ = "hrms_attendance"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"att_{uuid.uuid4().hex[:8]}")
    employee_id = Column(String, ForeignKey("hrms_employees.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=True)
    check_in = Column(String, nullable=True)
    check_out = Column(String, nullable=True)
    status = Column(String, nullable=True)
    work_hours = Column(Float, nullable=True)
    device_id = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class LeaveType(Base):
    __tablename__ = "hrms_leave_types"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"lt_{uuid.uuid4().hex[:8]}")
    name = Column(String, nullable=False, unique=True)
    code = Column(String, nullable=False, unique=True)
    category = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    paid_type = Column(String, nullable=False)
    is_paid = Column(Boolean, nullable=True)
    gender_eligibility = Column(JSON, nullable=False)
    employment_types = Column(JSON, nullable=True)
    applicable_departments = Column(JSON, nullable=True)
    applicable_designations = Column(JSON, nullable=True)
    min_service_days = Column(Integer, nullable=True)
    annual_quota = Column(Float, nullable=True)
    max_consecutive_days = Column(Integer, nullable=True)
    carry_forward_allowed = Column(Boolean, nullable=True)
    max_carry_forward_days = Column(Integer, nullable=True)
    encashment_allowed = Column(Boolean, nullable=True)
    max_encashment_days = Column(Integer, nullable=True)
    attachment_required = Column(Boolean, nullable=True)
    is_active = Column(Boolean, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class EmployeeLeaveBalance(Base):
    __tablename__ = "hrms_leave_balances"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"bal_{uuid.uuid4().hex[:8]}")
    employee_id = Column(String, ForeignKey("hrms_employees.id", ondelete="CASCADE"), nullable=False)
    leave_type_id = Column(String, ForeignKey("hrms_leave_types.id", ondelete="CASCADE"), nullable=False)
    year = Column(Integer, nullable=True)
    allocated_days = Column(Float, nullable=True)
    used_days = Column(Float, nullable=True)
    pending_days = Column(Float, nullable=True)
    buffer_days = Column(Float, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class LeaveRequest(Base):
    __tablename__ = "hrms_leaves"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"leave_{uuid.uuid4().hex[:8]}")
    employee_id = Column(String, ForeignKey("hrms_employees.id", ondelete="CASCADE"), nullable=False)
    leave_type_id = Column(String, nullable=True)
    leave_type = Column(String, nullable=False)
    paid_type = Column(String, nullable=True)
    is_paid = Column(Boolean, nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    days = Column(Integer, nullable=True)
    reason = Column(Text, nullable=True)
    status = Column(String, nullable=True)
    approved_by = Column(String, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    attachment_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PayrollRecord(Base):
    __tablename__ = "hrms_payroll"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"pay_{uuid.uuid4().hex[:8]}")
    employee_id = Column(String, ForeignKey("hrms_employees.id", ondelete="CASCADE"), nullable=False)
    month = Column(String, nullable=False)
    year = Column(Integer, nullable=True)
    base_salary = Column(Float, nullable=True)
    allowances = Column(Float, nullable=True)
    deductions = Column(Float, nullable=True)
    net_salary = Column(Float, nullable=True)
    status = Column(String, nullable=True)
    payment_method = Column(String, nullable=True)
    payment_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class RecruitmentJob(Base):
    __tablename__ = "hrms_recruitment_jobs"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"job_{uuid.uuid4().hex[:8]}")
    title = Column(String, nullable=False)
    department = Column(String, nullable=False)
    openings = Column(Integer, nullable=True)
    job_type = Column(String, nullable=True)
    experience = Column(String, nullable=True)
    salary_range = Column(String, nullable=True)
    status = Column(String, nullable=True)
    posted_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class JobApplicant(Base):
    __tablename__ = "hrms_recruitment_applicants"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"app_{uuid.uuid4().hex[:8]}")
    job_id = Column(String, ForeignKey("hrms_recruitment_jobs.id", ondelete="CASCADE"), nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    stage = Column(String, nullable=True)
    experience_years = Column(Float, nullable=True)
    rating = Column(Float, nullable=True)
    resume_url = Column(String, nullable=True)
    applied_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class EmployeePerformance(Base):
    __tablename__ = "hrms_performance"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"perf_{uuid.uuid4().hex[:8]}")
    employee_id = Column(String, ForeignKey("hrms_employees.id", ondelete="CASCADE"), nullable=False)
    review_period = Column(String, nullable=False)
    score = Column(Float, nullable=True)
    kpi_ratings = Column(JSON, nullable=True)
    feedback = Column(Text, nullable=True)
    reviewer = Column(String, nullable=True)
    status = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ExitRequest(Base):
    __tablename__ = "hrms_exit_requests"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"exit_{uuid.uuid4().hex[:8]}")
    employee_id = Column(String, ForeignKey("hrms_employees.id", ondelete="CASCADE"), nullable=False)
    resignation_date = Column(Date, nullable=True)
    last_working_day = Column(Date, nullable=False)
    reason = Column(Text, nullable=True)
    handover_status = Column(String, nullable=True)
    settlement_status = Column(String, nullable=True)
    status = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class GeofenceScheme(Base):
    __tablename__ = "hrms_geofence_schemes"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"scheme_{uuid.uuid4().hex[:8]}")
    name = Column(String, nullable=False, unique=True)
    branch_name = Column(String, nullable=True)
    gym_name = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    radius_meters = Column(Integer, nullable=True)
    strict_restriction = Column(Boolean, nullable=True)
    ip_whitelist = Column(String, nullable=True)
    shift_start_time = Column(String, nullable=True)
    shift_end_time = Column(String, nullable=True)
    grace_period_mins = Column(Integer, nullable=True)
    min_half_day_hours = Column(Float, nullable=True)
    allowed_channels = Column(JSON, nullable=True)
    assigned_employee_ids = Column(JSON, nullable=True)
    is_active = Column(Boolean, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SalaryStructure(Base):
    __tablename__ = "hrms_salary_structures"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"sal_{uuid.uuid4().hex[:8]}")
    employee_id = Column(String, ForeignKey("hrms_employees.id", ondelete="CASCADE"), nullable=False, unique=True)
    basic_salary = Column(Float, nullable=True)
    hra = Column(Float, nullable=True)
    other_allowances = Column(Float, nullable=True)
    pf_deduction = Column(Float, nullable=True)
    esi_deduction = Column(Float, nullable=True)
    tds_deduction = Column(Float, nullable=True)
    other_deductions = Column(Float, nullable=True)
    gross_salary = Column(Float, nullable=True)
    total_deductions = Column(Float, nullable=True)
    net_salary = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Payslip(Base):
    __tablename__ = "hrms_payslips"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"slip_{uuid.uuid4().hex[:8]}")
    employee_id = Column(String, ForeignKey("hrms_employees.id", ondelete="CASCADE"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    pay_period = Column(String, nullable=True)
    basic_salary = Column(Float, nullable=True)
    hra = Column(Float, nullable=True)
    other_allowances = Column(Float, nullable=True)
    gross_salary = Column(Float, nullable=True)
    pf_deduction = Column(Float, nullable=True)
    esi_deduction = Column(Float, nullable=True)
    tds_deduction = Column(Float, nullable=True)
    other_deductions = Column(Float, nullable=True)
    total_deductions = Column(Float, nullable=True)
    net_salary = Column(Float, nullable=True)
    payable_days = Column(Float, nullable=True)
    present_days = Column(Float, nullable=True)
    leave_days = Column(Float, nullable=True)
    lop_days = Column(Float, nullable=True)
    status = Column(String, nullable=True)
    payment_method = Column(String, nullable=True)
    transaction_ref = Column(String, nullable=True)
    disbursed_at = Column(DateTime, nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow)


class PayslipTemplate(Base):
    __tablename__ = "hrms_payslip_templates"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"tmpl_{uuid.uuid4().hex[:8]}")
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    theme_color = Column(String, nullable=True)
    is_default = Column(Boolean, nullable=True)
    header_config = Column(JSON, nullable=True)
    notes_config = Column(JSON, nullable=True)
    styling_config = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmployeeLoan(Base):
    __tablename__ = "hrms_employee_loans"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"loan_{uuid.uuid4().hex[:8]}")
    employee_id = Column(String, ForeignKey("hrms_employees.id", ondelete="CASCADE"), nullable=False)
    loan_type = Column(String, nullable=True)
    principal_amount = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=True)
    tenure_months = Column(Integer, nullable=True)
    monthly_emi = Column(Float, nullable=True)
    paid_amount = Column(Float, nullable=True)
    remaining_amount = Column(Float, nullable=True)
    start_month = Column(Integer, nullable=True)
    start_year = Column(Integer, nullable=True)
    reason = Column(String, nullable=True)
    status = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SalaryAdvance(Base):
    __tablename__ = "hrms_salary_advances"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"adv_{uuid.uuid4().hex[:8]}")
    employee_id = Column(String, ForeignKey("hrms_employees.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    month = Column(Integer, nullable=True)
    year = Column(Integer, nullable=True)
    reason = Column(String, nullable=True)
    approved_by = Column(String, nullable=True)
    status = Column(String, nullable=True)
    disbursed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class EmployeeBonus(Base):
    __tablename__ = "hrms_employee_bonuses"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"bon_{uuid.uuid4().hex[:8]}")
    employee_id = Column(String, ForeignKey("hrms_employees.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    bonus_type = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    month = Column(Integer, nullable=True)
    year = Column(Integer, nullable=True)
    remarks = Column(String, nullable=True)
    status = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SalesCommission(Base):
    __tablename__ = "hrms_sales_commissions"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"comm_{uuid.uuid4().hex[:8]}")
    employee_id = Column(String, ForeignKey("hrms_employees.id", ondelete="CASCADE"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    target_quota = Column(Float, nullable=True)
    achieved_volume = Column(Float, nullable=True)
    commission_rate = Column(Float, nullable=True)
    commission_mode = Column(String, nullable=True)
    total_commission = Column(Float, nullable=True)
    status = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class CommissionSlabPlan(Base):
    __tablename__ = "hrms_commission_slab_plans"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"slab_{uuid.uuid4().hex[:8]}")
    name = Column(String, nullable=False)
    slabs = Column(JSON, nullable=True)
    milestone_bonus_amt = Column(Float, nullable=True)
    milestone_bonus_active = Column(Boolean, nullable=True)
    is_default = Column(Boolean, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PayGrade(Base):
    __tablename__ = "hrms_pay_grades"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: f"grd_{uuid.uuid4().hex[:8]}")
    name = Column(String, nullable=False)
    designation_id = Column(String, ForeignKey("hrms_designations.id", ondelete="SET NULL"), nullable=True)
    min_salary = Column(Float, nullable=True)
    max_salary = Column(Float, nullable=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


