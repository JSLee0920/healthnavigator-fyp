from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.ingestion.embedder import DatasetEmbedder

router = APIRouter(prefix="/admin", tags=["Admin"])


class IngestRequest(BaseModel):
    filename: str


@router.post("/ingest")
async def trigger_ingestion(request: IngestRequest):
    try:
        embedder = DatasetEmbedder()
        result = embedder.ingest_dataset(request.filename)
        return {"status": "success", "message": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
