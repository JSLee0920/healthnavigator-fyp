import logging
import asyncio
import re
import urllib.parse
import uuid
from datetime import datetime, timezone
from typing import Annotated, Optional
from pathlib import Path

import jwt
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.params import File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from qdrant_client.models import FieldCondition, Filter, FilterSelector, MatchValue
from sqlalchemy import func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.db.neo4j_client import neo4j_driver
from app.db.postgres_client import AsyncSessionLocal, get_db
from app.db.qdrant_client import qdrant
from app.services.ingestion.embedder import DatasetEmbedder
from app.api.dependencies import get_current_user
from app.models.schema import Document, User
from app.core.validators import validate_filename

QDRANT_COLLECTION = "healthcare_info"
MEDLINEPLUS_XML_PATTERN = re.compile(r"^mplus_topics_.+\.xml$", re.IGNORECASE)
MEDLINEPLUS_HINT = "mplus_topics_*.xml"
PDF_MAX_BYTES = 20 * 1024 * 1024
XML_MAX_BYTES = 100 * 1024 * 1024


def _check_uploaded_file(filename: str, size_bytes: int) -> None:
    """Reject anything that isn't a PDF or a MedlinePlus XML drop.

    Parser/embedder are hardcoded to MedlinePlus schema for XML, so a generic
    .xml would silently produce zero chunks and mark the row as completed —
    confusing. Restrict at the boundary instead. Filename pattern matches
    MedlinePlus's dated dumps (e.g. mplus_topics_2026-05-12.xml).
    """
    is_pdf = filename.lower().endswith(".pdf")
    is_allowed_xml = bool(MEDLINEPLUS_XML_PATTERN.match(filename))

    if not is_pdf and not is_allowed_xml:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Only PDF files or MedlinePlus XML ('{MEDLINEPLUS_HINT}') are supported."
            ),
        )
    if is_pdf and size_bytes > PDF_MAX_BYTES:
        raise HTTPException(status_code=413, detail="PDF exceeds 20MB limit.")
    if is_allowed_xml and size_bytes > XML_MAX_BYTES:
        raise HTTPException(status_code=413, detail="XML exceeds 100MB limit.")

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
@router.post("/ingest")
async def upload_document(
    file: Annotated[UploadFile, File(...)],
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
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
    # Reject by extension/name before touching disk. Real size check happens
    # after the write since UploadFile.size is None for some clients.
    _check_uploaded_file(file.filename, 0)

    existing = (
        await db.execute(select(Document).where(Document.filename == file.filename))
    ).scalar_one_or_none()
    if existing and existing.status != "failed":
        raise HTTPException(
            status_code=409,
            detail="A document with that filename already exists. Delete it first.",
        )

    project_root = Path(__file__).resolve().parents[4]
    upload_dir = project_root / "data" / "raw_data"
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / file.filename

    is_pdf = file.filename.lower().endswith(".pdf")
    max_bytes = PDF_MAX_BYTES if is_pdf else XML_MAX_BYTES
    size_bytes = 0
    try:
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                size_bytes += len(chunk)
                if size_bytes > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            "PDF exceeds 20MB limit." if is_pdf
                            else "XML exceeds 100MB limit."
                        ),
                    )
                buffer.write(chunk)
    except HTTPException:
        file_path.unlink(missing_ok=True)
        raise
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Could not save file to disk")

    if existing:
        existing.status = "pending"
        existing.error_msg = None
        existing.size_bytes = size_bytes
        existing.mime_type = file.content_type
        existing.uploaded_by = user.user_id
        existing.uploaded_at = datetime.now(timezone.utc)
        existing.completed_at = None
        doc = existing
    else:
        doc = Document(
            filename=file.filename,
            mime_type=file.content_type,
            size_bytes=size_bytes,
            status="pending",
            uploaded_by=user.user_id,
        )
        db.add(doc)
    await db.commit()
    await db.refresh(doc)

    return {
        "status": "success",
        "message": f"File {file.filename} secured. Ready for pipeline.",
        "filename": file.filename,
        "document_id": str(doc.id),
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

    async with AsyncSessionLocal() as db:
        doc = (
            await db.execute(select(Document).where(Document.filename == filename))
        ).scalar_one_or_none()
        if not doc:
            await websocket.send_json(
                {"type": "error", "message": "Document row missing. Re-upload required."}
            )
            await websocket.close(code=1008)
            return
        doc_id = doc.id
        doc.status = "processing"
        doc.error_msg = None
        await db.commit()

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

        async with AsyncSessionLocal() as db:
            doc = await db.get(Document, doc_id)
            if doc:
                doc.status = "completed"
                doc.completed_at = datetime.now(timezone.utc)
                doc.error_msg = None
                await db.commit()

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
        async with AsyncSessionLocal() as db:
            doc = await db.get(Document, doc_id)
            if doc:
                doc.status = "failed"
                doc.error_msg = str(e)[:1000]
                await db.commit()
        try:
            await websocket.send_json(
                {"type": "error", "message": f"FATAL EXCEPTION: {str(e)}"}
            )
        except Exception:
            pass
    finally:
        # Guard: if status still 'processing' (disconnect/crash mid-pipeline),
        # mark failed so the row isn't stuck.
        try:
            async with AsyncSessionLocal() as db:
                doc = await db.get(Document, doc_id)
                if doc and doc.status == "processing":
                    doc.status = "failed"
                    doc.error_msg = "Pipeline aborted before completion"
                    await db.commit()
        except Exception as guard_err:
            logger.error(f"Failed to reconcile document status: {guard_err}")
        # Socket may already be closed (client disconnect, prior close, etc.).
        # Re-closing raises RuntimeError on starlette; swallow it.
        try:
            await websocket.close()
        except RuntimeError:
            pass


# --- Document Management ---


class DocumentOut(BaseModel):
    id: uuid.UUID
    filename: str
    mime_type: Optional[str]
    size_bytes: int
    status: str
    error_msg: Optional[str]
    uploaded_by: Optional[uuid.UUID]
    uploader_email: Optional[str]
    uploaded_at: datetime
    completed_at: Optional[datetime]


class DocumentListOut(BaseModel):
    items: list[DocumentOut]
    total: int
    page: int
    page_size: int


def _doc_to_out(doc: Document, uploader_email: Optional[str]) -> DocumentOut:
    return DocumentOut(
        id=doc.id,
        filename=doc.filename,
        mime_type=doc.mime_type,
        size_bytes=doc.size_bytes,
        status=doc.status,
        error_msg=doc.error_msg,
        uploaded_by=doc.uploaded_by,
        uploader_email=uploader_email,
        uploaded_at=doc.uploaded_at,
        completed_at=doc.completed_at,
    )


@router.get(
    "/documents",
    response_model=DocumentListOut,
    dependencies=[Depends(require_admin)],
)
async def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    base = select(Document, User.email).join(
        User, User.user_id == Document.uploaded_by, isouter=True
    )
    count_q = select(sa_func.count(Document.id))

    if status:
        base = base.where(Document.status == status)
        count_q = count_q.where(Document.status == status)
    if q:
        like = f"%{q}%"
        base = base.where(Document.filename.ilike(like))
        count_q = count_q.where(Document.filename.ilike(like))

    base = base.order_by(Document.uploaded_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size)

    rows = (await db.execute(base)).all()
    total = (await db.execute(count_q)).scalar_one()

    items = [_doc_to_out(doc, email) for doc, email in rows]
    return DocumentListOut(items=items, total=total, page=page, page_size=page_size)


@router.get(
    "/documents/{document_id}",
    response_model=DocumentOut,
    dependencies=[Depends(require_admin)],
)
async def get_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    row = (
        await db.execute(
            select(Document, User.email)
            .join(User, User.user_id == Document.uploaded_by, isouter=True)
            .where(Document.id == document_id)
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    doc, email = row
    return _doc_to_out(doc, email)


@router.delete(
    "/documents/{document_id}",
    dependencies=[Depends(require_admin)],
)
async def delete_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    doc = await db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status == "processing":
        raise HTTPException(
            status_code=409,
            detail="Document is currently being processed. Try again once ingestion completes or fails.",
        )

    filename = doc.filename

    if doc.status != "deleting":
        doc.status = "deleting"
        await db.commit()

    async def _mark_delete_failed(msg: str) -> None:
        # Persist the failure on the row so the UI can surface it and the
        # admin can retry. Without this the row stays in `deleting` with no
        # context.
        try:
            doc.status = "failed"
            doc.error_msg = msg[:1000]
            await db.commit()
        except Exception as commit_err:
            logger.error(f"Failed to persist delete-failure status: {commit_err}")

    # 1. Qdrant: filter-delete all points where payload.source == filename
    try:
        await qdrant.delete(
            collection_name=QDRANT_COLLECTION,
            points_selector=FilterSelector(
                filter=Filter(
                    must=[
                        FieldCondition(
                            key="source", match=MatchValue(value=filename)
                        )
                    ]
                )
            ),
        )
    except Exception as e:
        logger.error(f"Qdrant delete failed for {filename}: {e}")
        await _mark_delete_failed(f"Qdrant cleanup failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Qdrant cleanup failed: {e}"
        )

    # 2. Neo4j: drop Topic nodes tagged with this source
    try:
        async with neo4j_driver.session() as nsession:
            await nsession.run(
                "MATCH (t:Topic {source: $source}) DETACH DELETE t",
                source=filename,
            )
    except Exception as e:
        logger.error(f"Neo4j delete failed for {filename}: {e}")
        await _mark_delete_failed(f"Neo4j cleanup failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Neo4j cleanup failed: {e}"
        )

    # 3. Disk: remove original file
    try:
        project_root = Path(__file__).resolve().parents[4]
        upload_dir = project_root / "data" / "raw_data"
        (upload_dir / filename).unlink(missing_ok=True)
    except Exception as e:
        logger.error(f"Disk delete failed for {filename}: {e}")
        await _mark_delete_failed(f"File cleanup failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"File cleanup failed: {e}"
        )

    # 4. Postgres: drop row
    try:
        await db.delete(doc)
        await db.commit()
    except Exception as e:
        logger.error(f"Postgres delete failed for {filename}: {e}")
        await _mark_delete_failed(f"Document row cleanup failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Document row cleanup failed: {e}"
        )

    return {"status": "success", "filename": filename}


@router.get(
    "/documents/{document_id}/download",
    dependencies=[Depends(require_admin)],
)
async def download_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    doc = await db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    validate_filename(doc.filename)

    project_root = Path(__file__).resolve().parents[4]
    upload_dir = (project_root / "data" / "raw_data").resolve()
    file_path = (upload_dir / doc.filename).resolve()

    # Defence in depth — DB filename is already trusted but cheap to check.
    if not file_path.is_relative_to(upload_dir):
        raise HTTPException(status_code=400, detail="Invalid file path")
    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Original file missing on disk. The document row may be orphaned.",
        )

    def _iter():
        with open(file_path, "rb") as f:
            while True:
                chunk = f.read(64 * 1024)
                if not chunk:
                    break
                yield chunk

    quoted = urllib.parse.quote(doc.filename)
    return StreamingResponse(
        _iter(),
        media_type=doc.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quoted}",
        },
    )
