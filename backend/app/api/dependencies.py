import jwt
from fastapi import Depends, HTTPException, Request, WebSocket, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.db.postgres_client import AsyncSessionLocal, get_db
from app.models.schema import User


def _decode_token(token: str) -> str | None:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload.get("sub")
    except jwt.InvalidTokenError:
        return None


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )

    token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. No access token cookie found.",
        )

    user_id = _decode_token(token)
    if user_id is None:
        raise credentials_exception

    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalars().first()

    if user is None:
        raise credentials_exception

    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user


async def get_current_admin_ws(websocket: WebSocket) -> User | None:
    """Authenticates a WebSocket connection as an admin.

    Closes the socket with 1008 and returns None on failure so the caller can
    abort cleanly. Caller must `await websocket.accept()` first.
    """
    token = websocket.cookies.get("access_token")
    if not token:
        await websocket.close(code=1008)
        return None

    user_id = _decode_token(token)
    if not user_id:
        await websocket.close(code=1008)
        return None

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.user_id == user_id))
        user = result.scalars().first()

    if user is None or user.role != "admin":
        await websocket.close(code=1008)
        return None
    return user
