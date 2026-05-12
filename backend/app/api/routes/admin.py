import logging
import asyncio
import shutil
from typing import Annotated
from pathlib import Path

import jwt
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.params import File
from sqlalchemy.future import select

from app.core.config import settings
from app.db.postgres_client import AsyncSessionLocal
from app.services.ingestion.embedder import DatasetEmbedder
from app.api.dependencies import get_current_user
from app.models.schema import User
from app.core.validators import validate_filename

router = APIRouter(prefix="/admin", tags=["Admin"])
logger = logging.getLogger(__name__)

logging.basicConfig(level=logging.INFO)

try:
    print("Booting up Models for Ingestion Router...")
    shared_embedder = DatasetEmbedder()
except Exception as e:
    logger.error(f"Failed to load ML models on startup: {e}")
    shared_embedder = None


def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user


# --- The File Upload Route ---
@router.post("/ingest", dependencies=[Depends(require_admin)])
async def upload_document(
    file: Annotated[UploadFile, File(...)],
):
    if shared_embedder is None:
        raise HTTPException(
            status_code=503, detail="Embedder models failed to load on startup."
        )

    if not file.filename:
        raise HTTPException(
            status_code=400, detail="Uploaded file must have a filename."
        )

    validate_filename(file.filename)

    project_root = Path(__file__).resolve().parents[4]
    upload_dir = project_root / "data" / "raw_data"
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / file.filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        raise HTTPException(status_code=500, detail="Could not save file to disk")

    return {
        "status": "success",
        "message": f"File {file.filename} secured. Ready for pipeline.",
        "filename": file.filename,
    }


async def _authorize_admin_ws(websocket: WebSocket) -> User | None:
    token = websocket.cookies.get("access_token")
    if not token:
        await websocket.close(code=1008)
        return None
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=1008)
            return None
    except jwt.InvalidTokenError:
        await websocket.close(code=1008)
        return None

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.user_id == user_id))
        user = result.scalars().first()

    if user is None or user.role != "admin":
        await websocket.close(code=1008)
        return None
    return user


# --- The Real-Time WebSocket Terminal ---
@router.websocket("/ws/ingest-status/{filename}")
async def ingestion_terminal_stream(websocket: WebSocket, filename: str):
    await websocket.accept()

    user = await _authorize_admin_ws(websocket)
    if user is None:
        return

    try:
        validate_filename(filename)
    except HTTPException:
        await websocket.send_json(
            {"type": "error", "message": "Invalid filename."}
        )
        await websocket.close(code=1008)
        return

    project_root = Path(__file__).resolve().parents[4]
    upload_dir = project_root / "data" / "raw_data"
    file_path = upload_dir / filename
    if not file_path.is_file():
        await websocket.send_json(
            {"type": "error", "message": "Requested file does not exist."}
        )
        await websocket.close(code=1008)
        return

    if shared_embedder is None:
        await websocket.send_json(
            {"type": "error", "message": "FATAL EXCEPTION: ML Models offline."}
        )
        await websocket.close()
        return

    try:
        # Simulated early logs to show the UI reacting instantly
        await websocket.send_json(
            {"type": "system", "message": f"Initializing pipeline for {filename}..."}
        )
        await asyncio.sleep(1)

        await websocket.send_json(
            {
                "type": "info",
                "message": "Extracting text and chunking semantic segments...",
            }
        )
        await asyncio.sleep(1.5)

        await websocket.send_json(
            {"type": "info", "message": "Running NLP Entity Extraction (GLiNER)..."}
        )
        await asyncio.sleep(1.5)

        await websocket.send_json(
            {
                "type": "info",
                "message": "Building Knowledge Graph edges and storing Qdrant vectors...",
            }
        )

        active_embedder = shared_embedder
        await active_embedder.ingest_dataset(filename)

        # Step 3: Success
        await websocket.send_json(
            {
                "type": "success",
                "message": "Pipeline complete. Knowledge base successfully updated.",
            }
        )

    except WebSocketDisconnect:
        logger.info(f"Admin client disconnected during ingestion of {filename}")
    except Exception as e:
        logger.error(f"Ingestion pipeline failed: {e}")
        await websocket.send_json(
            {"type": "error", "message": f"FATAL EXCEPTION: {str(e)}"}
        )
    finally:
        await websocket.close()
