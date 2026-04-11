from fastapi import APIRouter, Depends, HTTPException

# from fastapi.responses import StreamingResponse
from app.api.dependencies import get_current_user
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.postgres_client import get_db
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

    # return StreamingResponse(
    #     rag_service.stream_response(
    #         user_id=str(current_user.user_id), question=request.message
    #     ),
    #     media_type="text/event-stream",
    # )

    final_answer = await rag_service.get_response(
        user_id=str(current_user.user_id),
        question=request.message,
        chat_history=chat_history_dicts,
    )

    ai_msg = Message(session_id=actual_session_id, role="ai", content=final_answer)

    db.add(ai_msg)
    await db.commit()

    return {"reply": final_answer, "session": actual_session_id}
