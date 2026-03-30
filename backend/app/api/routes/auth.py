from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.postgres_client import get_db
from app.models.schema import User
from app.core.config import settings
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/auth", tags=["Authentication"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class LoginRequest(BaseModel):
    email: str
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
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticates the user and returns a JWT."""

    result = await db.execute(select(User).where(User.email == request.email))
    account = result.scalars().first()

    if not account or not pwd_context.verify(request.password, account.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token_data = {"sub": account.user_id, "role": account.role}
    access_token = create_access_token(token_data)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": account.user_id,
        "username": account.username,
        "role": account.role,
    }
