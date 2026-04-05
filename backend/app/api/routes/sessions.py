from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.postgres_client import get_db
from app.api.dependencies import get_current_user
from app.models.schema import User, Session, Message

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.get("")
async def list_sessions(
    current_user: User = Depends(get_current_user),
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=10),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session)
        .where(Session.user_id == current_user.user_id)
        .order_by(Session.last_active.desc())
        .limit(limit)
        .offset(offset)
    )
    return {"sessions": result.scalars().all()}


@router.get("/{session_id}/messages")
async def get_session_messages(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session_result = await db.execute(
        select(Session).where(Session.session_id == session_id)
    )
    chat_session = session_result.scalars().first()

    if not chat_session or str(chat_session.user_id) != str(current_user.user_id):
        raise HTTPException(status_code=404, detail="Session not found")

    msg_result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.timestamp.asc())
    )

    return {"messages": msg_result.scalars().all()}


@router.delete("/{session_id}")
async def delete_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session_result = await db.execute(
        select(Session).where(Session.session_id == session_id)
    )
    chat_session = session_result.scalars().first()

    if not chat_session or str(chat_session.user_id) != str(current_user.user_id):
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        await db.delete(chat_session)
        await db.commit()
        return {"status": "sucess", "message": "Chat deleted"}
    except Exception as e:
        await db.rollback()
        print(f"Delete failed: {e}")
        raise HTTPException(status_code=500, detail="Could not delete session")
