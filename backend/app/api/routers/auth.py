from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.db.session import get_db
from app.core.config import settings
from app.core.security import verify_password, create_access_token
from app.core.dependencies import get_current_user, rate_limiter, record_audit_log
from app.models.models import User, Role
from app.schemas.auth import LoginRequest, Token, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])

@router.post("/login", response_model=Token, dependencies=[Depends(rate_limiter(max_requests=20, window_seconds=60))])
def login(request: Request, login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user with username or email and return JWT access token with role claims.
    """
    user = db.query(User).filter(
        (User.username == login_data.username_or_email) | 
        (User.email == login_data.username_or_email)
    ).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated"
        )

    role_name = user.role.name if user.role else "Unknown"
    access_token = create_access_token(subject=user.id, role=role_name)

    # Log successful login
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(
        db=db,
        user_id=user.id,
        action="login",
        target_entity="user",
        target_id=str(user.id),
        ip_address=client_ip
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=role_name,
        badge_number=user.badge_number
    )

@router.post("/token", response_model=Token, dependencies=[Depends(rate_limiter(max_requests=20, window_seconds=60))])
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    OAuth2 compatible token login for Swagger UI authorization.
    """
    user = db.query(User).filter(
        (User.username == form_data.username) | 
        (User.email == form_data.username)
    ).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    role_name = user.role.name if user.role else "Unknown"
    access_token = create_access_token(subject=user.id, role=role_name)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=role_name,
        badge_number=user.badge_number
    )

@router.get("/me", response_model=UserOut)
def read_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Retrieve profile details and verified role of current authenticated session.
    """
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        role=current_user.role.name if current_user.role else "Unknown",
        badge_number=current_user.badge_number,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )
