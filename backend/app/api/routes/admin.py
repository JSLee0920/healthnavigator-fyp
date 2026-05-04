import logging
from typing import Annotated
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile
from fastapi.params import File
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


@router.post("/ingest", dependencies=[Depends(require_admin)])
async def trigger_ingestion(
    background_tasks: BackgroundTasks,
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

    try:
        background_tasks.add_task(shared_embedder.ingest_dataset, file.filename)

        return {
            "status": "success",
            "message": f"Ingestion for {file.filename} started in the background!",
        }

    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
