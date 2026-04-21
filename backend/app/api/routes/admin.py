import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from app.services.ingestion.embedder import DatasetEmbedder
from app.core.validators import validate_filename

router = APIRouter(prefix="/admin", tags=["Admin"])
logger = logging.getLogger(__name__)

logging.basicConfig(level=logging.INFO)


class IngestRequest(BaseModel):
    filename: str


try:
    print("Booting up Models for Ingestion Router...")
    shared_embedder = DatasetEmbedder()
except Exception as e:
    logger.error(f"Failed to load ML models on startup: {e}")
    shared_embedder = None


@router.post("/ingest")
async def trigger_ingestion(request: IngestRequest, background_tasks: BackgroundTasks):
    validate_filename(request.filename)
    try:
        embedder = DatasetEmbedder()

        background_tasks.add_task(embedder.ingest_dataset, request.filename)

        return {
            "status": "success",
            "message": f"Ingestion for {request.filename} started in the background!",
        }

    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
