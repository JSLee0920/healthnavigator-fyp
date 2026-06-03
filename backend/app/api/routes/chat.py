import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone

from app.api.dependencies import get_current_user
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.postgres_client import AsyncSessionLocal, get_db
from app.models.schema import User, Message, Session
from app.services.rag.chain import HybridRagService

router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str


def get_rag_service() -> HybridRagService:
    return HybridRagService()


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    rag_service: HybridRagService = Depends(get_rag_service),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    actual_session_id = request.session_id
    is_new_session = False

    if actual_session_id:
        session_result = await db.execute(
            select(Session).where(Session.session_id == actual_session_id)
        )
        chat_session = session_result.scalars().first()
        if not chat_session or str(chat_session.user_id) != str(current_user.user_id):
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        chat_session = Session(user_id=current_user.user_id)
        db.add(chat_session)
        await db.commit()
        await db.refresh(chat_session)
        actual_session_id = str(chat_session.session_id)
        is_new_session = True

    chat_session.last_active = datetime.now(timezone.utc)
    db.add(chat_session)
    await db.commit()

    chat_history_dicts = []
    if actual_session_id:
        history_result = await db.execute(
            select(Message)
            .where(Message.session_id == actual_session_id)
            .order_by(Message.message_id.asc())
        )
        recent_messages = history_result.scalars().all()[
            -4:
        ]  # Grab the last 4 for context

        chat_history_dicts = [
            {"role": m.role, "content": m.content} for m in recent_messages
        ]

    user_msg = Message(
        session_id=actual_session_id, role="user", content=request.message
    )
    db.add(user_msg)
    await db.commit()

    if is_new_session:
        new_title = await rag_service.generate_session_title(request.message)
        chat_session.title = new_title
        db.add(chat_session)
        await db.commit()

    user_id_str = str(current_user.user_id)
    session_title = chat_session.title
    question = request.message

    async def event_stream():
        meta = {
            "type": "meta",
            "session": actual_session_id,
            "title": session_title,
            "is_new": is_new_session,
        }
        yield f"data: {json.dumps(meta)}\n\n"

        parts: list[str] = []
        try:
            async for chunk in rag_service.stream_response(
                user_id=user_id_str,
                question=question,
                chat_history=chat_history_dicts,
            ):
                parts.append(chunk)
                yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            return

        full_answer = "".join(parts)
        async with AsyncSessionLocal() as save_db:
            save_db.add(
                Message(
                    session_id=actual_session_id, role="ai", content=full_answer
                )
            )
            await save_db.commit()

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
