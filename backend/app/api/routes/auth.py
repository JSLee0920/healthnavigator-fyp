from fastapi import APIRouter, Depends, HTTPException, Request, Response, Header
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.postgres_client import get_db
from app.models.schema import User
from app.core.config import settings
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/auth", tags=["Authentication"])
limiter = Limiter(key_func=get_remote_address)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AdminRegisterRequest(BaseModel):
    email: str
    username: str
    password: str


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


@router.post("/login")
@limiter.limit("5/minute")
async def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Authenticates the user and returns a JWT."""

    result = await db.execute(select(User).where(User.email == form_data.username))
    account = result.scalars().first()

    if not account or not pwd_context.verify(form_data.password, account.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token_data = {"sub": str(account.user_id), "role": account.role}
    access_token = create_access_token(token_data)

    expire_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,  # Prevents JavaScript access (XSS protection)
        max_age=expire_seconds,  # Tells browser when to delete it
        samesite="lax",  # CSRF protection (use 'none' if frontend/backend domains differ entirely)
        secure=False,  # Set to True in production with HTTPS
        path="/",
    )

    return {
        "user_id": str(account.user_id),
        "username": account.username,
        "role": account.role,
        "message": "Authentication Successful!",
    }


@router.post("/register-admin")
async def register_admin(
    request: AdminRegisterRequest,
    x_admin_secret: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Secure backdoor to register an admin account using a secret header key."""

    if x_admin_secret != settings.ADMIN_CREATION_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin creation secret.")

    result = await db.execute(select(User).where(User.email == request.email))
    existing_user = result.scalars().first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered.")

    hashed_pwd = pwd_context.hash(request.password)

    new_admin = User(
        email=request.email,
        username=request.username,
        password=hashed_pwd,
        role="admin",
    )

    db.add(new_admin)
    await db.commit()
    await db.refresh(new_admin)

    return {"message": f"Admin account {request.username} successfully created!"}
