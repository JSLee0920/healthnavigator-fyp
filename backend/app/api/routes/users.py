from datetime import datetime, date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from app.db.postgres_client import get_db
from app.models.schema import User, HealthProfile
from passlib.context import CryptContext
from typing import Optional, List, Dict, Any
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class HealthProfileCreate(BaseModel):
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    blood_type: Optional[str] = None
    chronic_conditions: Optional[List[str]] = []
    allergies: Optional[List[str]] = []
    current_medications: Optional[List[str]] = []
    lifestyle_factors: Optional[Dict[str, Any]] = {}


class HealthProfileResponse(BaseModel):
    id: UUID
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    blood_type: Optional[str] = None
    chronic_conditions: Optional[List[str]] = []
    allergies: Optional[List[str]] = []
    current_medications: Optional[List[str]] = []
    lifestyle_factors: Optional[Dict[str, Any]] = {}
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserResponse(BaseModel):
    user_id: UUID
    username: str
    email: str
    role: str
    created_at: datetime | None = None
    health_profile: Optional[HealthProfileResponse] = None

    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    username: str | None = None


@router.post(
    "/",
    response_model=UserResponse,
)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email registered")

    hashed_pw = pwd_context.hash(user.password)
    new_user = User(username=user.username, email=user.email, password=hashed_pw)
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return UserResponse(
        user_id=new_user.user_id,
        username=new_user.username,
        email=new_user.email,
        role=new_user.role,
        created_at=new_user.created_at,
        health_profile=None,  # Explicitly set to None for new users
    )


@router.get("/user", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .options(selectinload(User.health_profile))
        .where(User.user_id == current_user.user_id)
    )
    user = result.scalars().first()
    return user


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


@router.post("/user/health-profile", response_model=HealthProfileResponse)
async def create_health_profile(
    profile_data: HealthProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(HealthProfile).where(HealthProfile.user_id == current_user.user_id)
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Health profile already exists")

    new_profile = HealthProfile(
        user_id=current_user.user_id, **profile_data.model_dump()
    )
    db.add(new_profile)
    await db.commit()
    await db.refresh(new_profile)
    return new_profile


@router.put("/user/health-profile", response_model=HealthProfileResponse)
async def update_health_profile(
    profile_data: HealthProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(HealthProfile).where(HealthProfile.user_id == current_user.user_id)
    )
    profile = result.scalars().first()

    if not profile:
        profile = HealthProfile(
            user_id=current_user.user_id, **profile_data.model_dump()
        )
        db.add(profile)
    else:
        update_dict = profile_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(profile, key, value)

    try:
        await db.commit()
        await db.refresh(profile)
        return profile
    except Exception as e:
        await db.rollback()
        print(f"Failed to update health profile: {e}")
        raise HTTPException(status_code=500, detail="Could not update health profile")


@router.get("/user/health-profile", response_model=HealthProfileResponse)
async def get_health_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(HealthProfile).where(HealthProfile.user_id == current_user.user_id)
    )
    profile = result.scalars().first()

    if not profile:
        raise HTTPException(status_code=404, detail="Health profile not found")

    return profile
