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
def signup_gym_owner(req: SignupRequest, db: Session = Depends(get_db)):
    if req.role != "GYM_OWNER":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Self-registration is restricted exclusively to Gym Owners.",
        )
    return AuthService.register_owner(
        db=db,
        full_name=req.full_name,
        email=req.email,
        password=req.password,
        phone=req.phone,
        gym_name=req.gym_name
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
