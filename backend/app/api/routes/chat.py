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
rag_service = HybridRagService()


class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    actual_session_id = request.session_id

    if actual_session_id:
        session_result = await db.execute(
            select(Session).where(Session.session_id == actual_session_id)
        )
        chat_session = session_result.scalars().first()
        if not chat_session or str(chat_session.user_id) != str(current_user.user_id):
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        new_session = Session(user_id=current_user.user_id)
        db.add(new_session)
        await db.commit()
        await db.refresh(new_session)
        actual_session_id = str(new_session.session_id)

    user_msg = Message(
        session_id=actual_session_id, role="user", content=request.message
    )
    db.add(user_msg)
    await db.commit()

    # return StreamingResponse(
    #     rag_service.stream_response(
    #         user_id=str(current_user.user_id), question=request.message
    #     ),
    #     media_type="text/event-stream",
    # )

    final_answer = await rag_service.get_response(
        user_id=str(current_user.user_id), question=request.message
    )

    ai_msg = Message(session_id=actual_session_id, role="ai", content=final_answer)

    db.add(ai_msg)
    await db.commit()

    return {"reply": final_answer, "session": actual_session_id}
