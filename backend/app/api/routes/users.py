from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from app.db.postgres_client import get_db
from app.models.schema import User
from passlib.context import CryptContext
from typing import Optional, List
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserResponse(BaseModel):
    user_id: UUID
    username: str
    email: str
    health_profile: Optional[List[str]] = None
    role: str
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    username: str | None = None
    health_profile: Optional[List[str]] = None


@router.post("/", response_model=UserResponse)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email registered")

    hashed_pw = pwd_context.hash(user.password)
    new_user = User(username=user.username, email=user.email, password=hashed_pw)
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return new_user


@router.get("/user", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/user", response_model=UserResponse)
async def update_user_profile(
    update_data: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    update_dict = update_data.model_dump(exclude_unset=True)

    for key, value in update_dict.items():
        setattr(current_user, key, value)

    try:
        await db.commit()
        await db.refresh(current_user)
        return current_user
    except Exception as e:
        await db.rollback()
        print(f"Failed to update profile: {e}")
        raise HTTPException(status_code=500, detail="Could not update profile")
