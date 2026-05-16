import asyncio
from typing import AsyncGenerator

from app.services.ingestion.embedder import DatasetEmbedder


async def run_ingestion(
    filename: str,
    embedder: DatasetEmbedder,
) -> AsyncGenerator[dict, None]:
    """Runs the ingestion pipeline for `filename`, yielding log events.

    Events are dicts shaped `{"type": str, "message": str}` so the caller can
    forward them straight to a WebSocket or log sink. Raises on embedder
    failure — the caller decides how to surface the error.
    """
    yield {"type": "system", "message": f"Initializing pipeline for {filename}..."}
    await asyncio.sleep(1)

    yield {
        "type": "info",
        "message": "Extracting text and chunking semantic segments...",
    }
    await asyncio.sleep(1.5)

    yield {"type": "info", "message": "Running NLP Entity Extraction (GLiNER)..."}
    await asyncio.sleep(1.5)

    yield {
        "type": "info",
        "message": "Building Knowledge Graph edges and storing Qdrant vectors...",
    }

    await embedder.ingest_dataset(filename)

    yield {
        "type": "success",
        "message": "Pipeline complete. Knowledge base successfully updated.",
    }
