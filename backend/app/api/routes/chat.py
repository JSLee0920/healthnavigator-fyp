from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.postgres_client import get_db
from app.models.schema import Message, Session
from app.services.crew.agents import HealthNavigatorCrew

router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    session_id: str
    user_id: str
    message: str


@router.post("/stream")
async def chat_stream(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    session_result = await db.execute(
        select(Session).where(Session.session_id == request.session_id)
    )
    if not session_result.scalars().first():
        raise HTTPException(status_code=404, detail="Session not found")

    user_msg = Message(
        session_id=request.session_id, role="user", content=request.message
    )
    db.add(user_msg)
    await db.commit()

    crew_service = HealthNavigatorCrew()

    return StreamingResponse(
        crew_service.run_query_stream(request.user_id, request.message),
        media_type="text/event-stream",
    )
