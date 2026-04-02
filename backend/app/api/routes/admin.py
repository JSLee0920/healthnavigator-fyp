from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from app.services.ingestion.embedder import DatasetEmbedder

router = APIRouter(prefix="/admin", tags=["Admin"])


class IngestRequest(BaseModel):
    filename: str


@router.post("/ingest")
async def trigger_ingestion(request: IngestRequest, background_tasks: BackgroundTasks):
    try:
        embedder = DatasetEmbedder()

        background_tasks.add_task(embedder.ingest_dataset, request.filename)

        return {
            "status": "success",
            "message": f"Ingestion for {request.filename} started in the background!",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
