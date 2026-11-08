from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.schemas.auth import LoginRequest, SignupRequest, Token
from src.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=Token)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    auth_data = AuthService.authenticate_user(db, req.email, req.password, role=req.role)
    if not auth_data:
        role_label = f" for selected role '{req.role}'" if req.role else ""
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid email, password, or unauthorized credentials{role_label}",
        )
    return auth_data

@router.post("/signup", response_model=Token)
def signup_owner(req: SignupRequest, db: Session = Depends(get_db)):
    if req.role.upper() not in ["OWNER"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Self-registration is restricted exclusively to Owners.",
        )
    return AuthService.register_owner(
        db=db,
        full_name=req.full_name,
        email=req.email,
        password=req.password,
        phone=req.phone,
        vahd_name=req.vahd_name
    )

from fastapi import Header

@router.get("/me")
def get_current_user_profile(
    authorization: str = Header(None),
    email: str = None,
    db: Session = Depends(get_db)
):
    token_payload = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        from src.utils.security import verify_token
        token_payload = verify_token(token)

    profile = AuthService.get_user_profile(db, email=email, token_payload=token_payload)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token or user session expired",
        )
    return profile

@router.put("/me")
@router.patch("/me")
def update_current_user_profile(
    payload: dict,
    authorization: str = Header(None),
    email: str = None,
    db: Session = Depends(get_db)
):
    token_payload = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        from src.utils.security import verify_token
        token_payload = verify_token(token)

    from src.models.user import User

    user = None
    if token_payload:
        user_id = token_payload.get("sub")
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
        if not user and token_payload.get("email"):
            user = db.query(User).filter(User.email.ilike(token_payload["email"])).first()

    if not user and email:
        user = db.query(User).filter(User.email.ilike(email)).first()

    if not user and payload.get("email"):
        user = db.query(User).filter(User.email.ilike(payload.get("email"))).first()

    if not user and payload.get("user_id"):
        user = db.query(User).filter(User.id == payload.get("user_id")).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User session expired or unauthorized. Please log in again."
        )

    if "full_name" in payload and payload["full_name"]:
        user.full_name = payload["full_name"].strip()
    elif "name" in payload and payload["name"]:
        user.full_name = payload["name"].strip()

    if "phone" in payload:
        user.phone = (payload["phone"] or "").strip()

    if "avatar_url" in payload:
        user.avatar_url = payload["avatar_url"]
    elif "avatar" in payload:
        user.avatar_url = payload["avatar"]

    if "role_title" in payload and payload["role_title"]:
        user.role_title = payload["role_title"].strip()

    # Sync with linked employee profile if exists
    try:
        from src.models.hrms import Employee
        emp = db.query(Employee).filter(Employee.user_id == user.id).first()
        if not emp:
            emp = db.query(Employee).filter(Employee.email == user.email).first()
        if emp:
            if user.full_name:
                parts = user.full_name.split(" ", 1)
                emp.first_name = parts[0]
                emp.last_name = parts[1] if len(parts) > 1 else ""
            if user.phone:
                emp.phone = user.phone
            if user.avatar_url:
                emp.profile_photo_url = user.avatar_url
    except Exception:
        pass

    # Sync with linked student record if exists
    try:
        from src.models.student import student
        st = db.query(student).filter(student.user_id == user.id).first()
        if not st:
            st = db.query(student).filter(student.email == user.email).first()
        if st:
            if user.full_name:
                st.full_name = user.full_name
            if user.phone:
                st.phone = user.phone
            if user.avatar_url:
                st.profile_image = user.avatar_url
    except Exception:
        pass

    db.commit()
    db.refresh(user)

    return AuthService.get_user_profile(db, token_payload={"sub": user.id, "email": user.email, "role": user.role})

@router.post("/change-password")
def change_password(
    payload: dict,
    authorization: str = Header(None),
    email: str = None,
    db: Session = Depends(get_db)
):
    """
    Self-service password reset for currently logged-in users (Owner, Head Office, Employees, Students).
    """
    token_payload = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        from src.utils.security import verify_token
        token_payload = verify_token(token)

    from src.models.user import User
    from src.utils.security import hash_password, verify_password

    user = None
    if token_payload:
        user_id = token_payload.get("sub")
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
        if not user and token_payload.get("email"):
            user = db.query(User).filter(User.email.ilike(token_payload["email"])).first()

    if not user and email:
        user = db.query(User).filter(User.email.ilike(email)).first()

    if not user and payload.get("email"):
        user = db.query(User).filter(User.email.ilike(payload.get("email"))).first()

    if not user and payload.get("user_id"):
        user = db.query(User).filter(User.id == payload.get("user_id")).first()

    if not user and payload.get("target_id"):
        user = db.query(User).filter((User.id == payload.get("target_id")) | (User.email.ilike(payload.get("target_id")))).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User session expired or unauthorized. Please log in again."
        )

    new_password = (payload.get("new_password") or payload.get("password") or "").strip()
    if not new_password or len(new_password) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 4 characters long."
        )

    # Optional current password check
    current_pwd = (payload.get("current_password") or payload.get("old_password") or "").strip()
    if current_pwd and user.password_hash:
        if not verify_password(current_pwd, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect."
            )

    user.password_hash = hash_password(new_password)
    db.commit()

    return {
        "status": "SUCCESS",
        "message": "Password updated successfully! You can now log in using your new password.",
        "user_id": user.id,
        "email": user.email
    }
