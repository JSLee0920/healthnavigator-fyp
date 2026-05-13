"""Backfill the `documents` table from files already on disk.

Use after deploying the document-management feature on an environment where
ingestion has previously run without the Document model existing. Walks
`data/raw_data/`, inserts one row per file with `status='completed'`, and
stamps existing Neo4j Topic nodes with `source` so they can be deleted
through the admin UI.

Run from repo root:

    cd backend && uv run python scripts/backfill_documents.py

Idempotent — files already present in the table are skipped.
"""

import asyncio
import logging
import mimetypes
import sys
from datetime import datetime, timezone
from pathlib import Path

# Make `app.*` importable when this file is run directly.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy.future import select  # noqa: E402

from app.db.neo4j_client import neo4j_driver  # noqa: E402
from app.db.postgres_client import AsyncSessionLocal  # noqa: E402
from app.models.schema import Document  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("backfill_documents")


async def backfill_postgres(upload_dir: Path) -> list[str]:
    """Insert a Document row per file in upload_dir. Returns inserted filenames."""
    inserted: list[str] = []

    if not upload_dir.is_dir():
        logger.warning(f"Upload dir {upload_dir} does not exist; nothing to backfill")
        return inserted

    files = [p for p in upload_dir.iterdir() if p.is_file()]
    logger.info(f"Found {len(files)} files in {upload_dir}")

    async with AsyncSessionLocal() as db:
        existing = (
            await db.execute(select(Document.filename))
        ).scalars().all()
        known = set(existing)

        for path in files:
            if path.name in known:
                logger.info(f"Skip {path.name} — already in documents table")
                continue

            mime_type, _ = mimetypes.guess_type(path.name)
            stat = path.stat()
            mtime = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)

            doc = Document(
                filename=path.name,
                mime_type=mime_type,
                size_bytes=stat.st_size,
                status="completed",
                uploaded_by=None,
                uploaded_at=mtime,
                completed_at=mtime,
            )
            db.add(doc)
            inserted.append(path.name)
            logger.info(f"Inserted {path.name} ({stat.st_size} bytes, {mime_type})")

        if inserted:
            await db.commit()

    return inserted


async def backfill_neo4j_sources(filenames: list[str]) -> None:
    """Stamp Topic.source for legacy nodes that match by title pattern.

    PDF topics are titled "<filename> (Page N)" — reverse-mappable.
    XML topics are titled with the disease name — NOT reverse-mappable.
    Skipping XML is a known limitation (delete-by-source will not reach them
    until they are re-ingested).
    """
    if not filenames:
        return

    async with neo4j_driver.session() as session:
        for fn in filenames:
            try:
                result = await session.run(
                    """
                    MATCH (t:Topic)
                    WHERE t.source IS NULL AND t.title STARTS WITH $prefix
                    SET t.source = $source
                    RETURN count(t) AS n
                    """,
                    prefix=f"{fn} (Page ",
                    source=fn,
                )
                record = await result.single()
                stamped = record["n"] if record else 0
                logger.info(f"Neo4j: stamped source={fn} on {stamped} Topic node(s)")
            except Exception as e:
                logger.error(f"Neo4j stamping failed for {fn}: {e}")


async def main() -> None:
    # backend/scripts/backfill_documents.py  →  repo_root = parents[2]
    repo_root = Path(__file__).resolve().parents[2]
    upload_dir = repo_root / "data" / "raw_data"
    logger.info(f"Backfilling from {upload_dir}")

    inserted = await backfill_postgres(upload_dir)
    logger.info(f"Inserted {len(inserted)} new document row(s)")

    await backfill_neo4j_sources(inserted)
    logger.info("Done.")


if __name__ == "__main__":
    asyncio.run(main())
