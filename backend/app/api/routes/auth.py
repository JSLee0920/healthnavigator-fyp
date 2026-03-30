from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.postgres_client import get_db
from app.models.schema import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == request.email))
    account = result.scalars().first()

    if not account or account.password != request.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "status": "success",
        "user_id": account.user_id,
        "username": account.username,
        "role": account.role,
    }
