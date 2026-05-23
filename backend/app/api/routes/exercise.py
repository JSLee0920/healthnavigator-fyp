from datetime import datetime, timedelta, timezone
from typing import Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.dependencies import get_current_user
from app.db.postgres_client import get_db
from app.models.schema import ExerciseGoal, ExerciseLog, User

router = APIRouter(prefix="/exercise", tags=["Exercise"])

Intensity = Literal["low", "medium", "high"]
DEFAULT_WEEKLY_TARGET = 150


class ExerciseLogCreate(BaseModel):
    activity_type: str = Field(..., min_length=1, max_length=100)
    duration_minutes: int = Field(..., gt=0, le=1440)
    intensity: Intensity = "medium"
    calories: Optional[int] = Field(None, ge=0, le=10000)
    notes: Optional[str] = Field(None, max_length=2000)
    logged_at: Optional[datetime] = None


class ExerciseLogUpdate(BaseModel):
    activity_type: Optional[str] = Field(None, min_length=1, max_length=100)
    duration_minutes: Optional[int] = Field(None, gt=0, le=1440)
    intensity: Optional[Intensity] = None
    calories: Optional[int] = Field(None, ge=0, le=10000)
    notes: Optional[str] = Field(None, max_length=2000)
    logged_at: Optional[datetime] = None


class ExerciseLogResponse(BaseModel):
    id: UUID
    activity_type: str
    duration_minutes: int
    intensity: str
    calories: Optional[int] = None
    notes: Optional[str] = None
    logged_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExerciseGoalResponse(BaseModel):
    weekly_target_minutes: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExerciseGoalUpdate(BaseModel):
    weekly_target_minutes: int = Field(..., ge=0, le=10080)


class ExerciseSummary(BaseModel):
    this_week_minutes: int
    weekly_target_minutes: int
    weekly_progress_pct: float
    total_logs: int
    current_streak_weeks: int


class WeeklyBucket(BaseModel):
    week_start: datetime
    week_end: datetime
    minutes: int
    met: bool


class ExerciseLogsPage(BaseModel):
    logs: list[ExerciseLogResponse]
    total: int


class WeeklyHistoryResponse(BaseModel):
    weeks: list[WeeklyBucket]
    weekly_target_minutes: int


def _start_of_week_utc() -> datetime:
    """Monday 00:00 UTC of the current week."""
    now = datetime.now(timezone.utc)
    monday = now - timedelta(days=now.weekday())
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)


async def _get_or_create_goal(db: AsyncSession, user_id: UUID) -> ExerciseGoal:
    result = await db.execute(
        select(ExerciseGoal).where(ExerciseGoal.user_id == user_id)
    )
    goal = result.scalars().first()
    if goal:
        return goal
    goal = ExerciseGoal(user_id=user_id, weekly_target_minutes=DEFAULT_WEEKLY_TARGET)
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.post("/logs", response_model=ExerciseLogResponse)
async def create_log(
    data: ExerciseLogCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payload = data.model_dump(exclude_unset=True)
    if not payload.get("logged_at"):
        payload["logged_at"] = datetime.now(timezone.utc)

    log = ExerciseLog(user_id=current_user.user_id, **payload)
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


@router.get("/logs", response_model=ExerciseLogsPage)
async def list_logs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    from_: Optional[datetime] = Query(None, alias="from"),
    to: Optional[datetime] = Query(None),
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    base = select(ExerciseLog).where(ExerciseLog.user_id == current_user.user_id)
    if from_:
        base = base.where(ExerciseLog.logged_at >= from_)
    if to:
        base = base.where(ExerciseLog.logged_at <= to)

    page_stmt = base.order_by(ExerciseLog.logged_at.desc()).limit(limit).offset(offset)
    page_result = await db.execute(page_stmt)

    total_stmt = select(func.count(ExerciseLog.id)).where(
        ExerciseLog.user_id == current_user.user_id
    )
    if from_:
        total_stmt = total_stmt.where(ExerciseLog.logged_at >= from_)
    if to:
        total_stmt = total_stmt.where(ExerciseLog.logged_at <= to)
    total_result = await db.execute(total_stmt)

    return ExerciseLogsPage(
        logs=[
            ExerciseLogResponse.model_validate(row)
            for row in page_result.scalars().all()
        ],
        total=int(total_result.scalar() or 0),
    )


@router.patch("/logs/{log_id}", response_model=ExerciseLogResponse)
async def update_log(
    log_id: UUID,
    data: ExerciseLogUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ExerciseLog).where(ExerciseLog.id == log_id))
    log = result.scalars().first()

    if not log or str(log.user_id) != str(current_user.user_id):
        raise HTTPException(status_code=404, detail="Log not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(log, key, value)

    await db.commit()
    await db.refresh(log)
    return log


@router.delete("/logs/{log_id}")
async def delete_log(
    log_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ExerciseLog).where(ExerciseLog.id == log_id))
    log = result.scalars().first()

    if not log or str(log.user_id) != str(current_user.user_id):
        raise HTTPException(status_code=404, detail="Log not found")

    try:
        await db.delete(log)
        await db.commit()
        return {"status": "success"}
    except Exception as e:
        await db.rollback()
        print(f"Delete exercise log failed: {e}")
        raise HTTPException(status_code=500, detail="Could not delete log")


@router.get("/goal", response_model=ExerciseGoalResponse)
async def get_goal(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_or_create_goal(db, current_user.user_id)


@router.put("/goal", response_model=ExerciseGoalResponse)
async def update_goal(
    data: ExerciseGoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    goal = await _get_or_create_goal(db, current_user.user_id)
    goal.weekly_target_minutes = data.weekly_target_minutes
    await db.commit()
    await db.refresh(goal)
    return goal


async def _minutes_in_window(
    db: AsyncSession, user_id: UUID, start: datetime, end: datetime
) -> int:
    """Sum of duration_minutes for [start, end)."""
    result = await db.execute(
        select(func.coalesce(func.sum(ExerciseLog.duration_minutes), 0)).where(
            ExerciseLog.user_id == user_id,
            ExerciseLog.logged_at >= start,
            ExerciseLog.logged_at < end,
        )
    )
    return int(result.scalar() or 0)


async def _compute_streak(
    db: AsyncSession,
    user_id: UUID,
    current_week_start: datetime,
    target_minutes: int,
) -> int:
    """Consecutive weeks (counting current if already met) meeting target."""
    if target_minutes <= 0:
        return 0
    streak = 0
    # Walk backward week-by-week. Stop on first non-meeting week. Cap iterations
    # at a sane number so we never scan the user's entire history if they have
    # an extreme streak.
    MAX_LOOKBACK = 520  # ~10 years
    cursor_start = current_week_start
    for _ in range(MAX_LOOKBACK):
        cursor_end = cursor_start + timedelta(days=7)
        minutes = await _minutes_in_window(db, user_id, cursor_start, cursor_end)
        if minutes >= target_minutes:
            streak += 1
            cursor_start = cursor_start - timedelta(days=7)
        else:
            break
    return streak


@router.get("/summary", response_model=ExerciseSummary)
async def get_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    week_start: Optional[datetime] = Query(None),
):
    goal = await _get_or_create_goal(db, current_user.user_id)
    if week_start is None:
        week_start = _start_of_week_utc()
    elif week_start.tzinfo is None:
        week_start = week_start.replace(tzinfo=timezone.utc)

    week_end = week_start + timedelta(days=7)
    this_week_minutes = await _minutes_in_window(
        db, current_user.user_id, week_start, week_end
    )

    total_result = await db.execute(
        select(func.count(ExerciseLog.id)).where(
            ExerciseLog.user_id == current_user.user_id
        )
    )
    total_logs = int(total_result.scalar() or 0)

    target = goal.weekly_target_minutes or 0
    pct = (this_week_minutes / target * 100) if target > 0 else 0.0

    streak = await _compute_streak(db, current_user.user_id, week_start, target)

    return ExerciseSummary(
        this_week_minutes=this_week_minutes,
        weekly_target_minutes=target,
        weekly_progress_pct=round(pct, 1),
        total_logs=total_logs,
        current_streak_weeks=streak,
    )


@router.get("/weekly-history", response_model=WeeklyHistoryResponse)
async def get_weekly_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    week_start: Optional[datetime] = Query(None),
    weeks: int = Query(8, ge=1, le=52),
):
    """Bars for the last N weeks ending with the current week."""
    goal = await _get_or_create_goal(db, current_user.user_id)
    target = goal.weekly_target_minutes or 0

    if week_start is None:
        week_start = _start_of_week_utc()
    elif week_start.tzinfo is None:
        week_start = week_start.replace(tzinfo=timezone.utc)

    buckets: list[WeeklyBucket] = []
    for i in range(weeks - 1, -1, -1):
        start = week_start - timedelta(days=7 * i)
        end = start + timedelta(days=7)
        minutes = await _minutes_in_window(db, current_user.user_id, start, end)
        buckets.append(
            WeeklyBucket(
                week_start=start,
                week_end=end,
                minutes=minutes,
                met=target > 0 and minutes >= target,
            )
        )

    return WeeklyHistoryResponse(weeks=buckets, weekly_target_minutes=target)
