from qdrant_client import AsyncQdrantClient
from app.core.config import settings

qdrant = AsyncQdrantClient(url=settings.QDRANT_URL)


async def get_vector_db():
    return qdrant
