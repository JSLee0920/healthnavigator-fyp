import logging
from pathlib import Path

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import FieldCondition, Filter, FilterSelector, MatchValue

from app.core.config import settings
from app.db.neo4j_client import neo4j_driver

logger = logging.getLogger(__name__)


class DocumentDeleterError(Exception):
    """Raised when a backing store cleanup step fails."""

    def __init__(self, stage: str, original: Exception):
        self.stage = stage
        self.original = original
        super().__init__(f"{stage} cleanup failed: {original}")


class DocumentDeleter:
    """Tears down a document's footprint across Qdrant, Neo4j, and disk."""

    def __init__(self, upload_dir: Path | None = None):
        self.qdrant = AsyncQdrantClient(url=settings.QDRANT_URL)
        self.collection_name = settings.QDRANT_COLLECTION
        self.upload_dir = upload_dir or settings.UPLOAD_DIR

    async def delete(self, filename: str) -> None:
        # Best-effort: attempt every stage so a Qdrant outage doesn't leave the
        # Neo4j topic nodes and disk file behind.
        errors: list[DocumentDeleterError] = []
        for step in (self._delete_qdrant, self._delete_neo4j):
            try:
                await step(filename)
            except DocumentDeleterError as e:
                errors.append(e)
        try:
            self._delete_disk(filename)
        except DocumentDeleterError as e:
            errors.append(e)

        if errors:
            stages = ", ".join(e.stage for e in errors)
            raise DocumentDeleterError(f"Partial delete ({stages})", errors[0].original)

    async def _delete_qdrant(self, filename: str) -> None:
        try:
            await self.qdrant.delete(
                collection_name=self.collection_name,
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
            raise DocumentDeleterError("Qdrant", e)

    async def _delete_neo4j(self, filename: str) -> None:
        try:
            async with neo4j_driver.session() as nsession:
                await nsession.run(
                    "MATCH (t:Topic {source: $source}) DETACH DELETE t",
                    source=filename,
                )
        except Exception as e:
            logger.error(f"Neo4j delete failed for {filename}: {e}")
            raise DocumentDeleterError("Neo4j", e)

    def _delete_disk(self, filename: str) -> None:
        try:
            upload_root = self.upload_dir.resolve()
            target = (upload_root / filename).resolve()
            # Defence in depth — refuse to unlink anything outside upload_root
            # even if a tainted filename gets past upstream validation.
            target.relative_to(upload_root)
            target.unlink(missing_ok=True)
        except Exception as e:
            logger.error(f"Disk delete failed for {filename}: {e}")
            raise DocumentDeleterError("File", e)
