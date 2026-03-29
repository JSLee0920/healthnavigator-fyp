from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct
from langchain_huggingface import HuggingFaceEmbeddings
import uuid
from app.core.config import settings
from app.services.ingestion.parser import HealthcareDataParser


class DatasetEmbedder:
    def __init__(self):
        self.qdrant = QdrantClient(url=settings.QDRANT_URL)
        self.collection_name = "healthcare_info"
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self._ensure_collection()

    def _ensure_collection(self):
        collections = self.qdrant.get_collections().collections
        if not any(c.name == self.collection_name for c in collections):
            self.qdrant.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )

    def ingest_dataset(self, filename: str):
        chunks = HealthcareDataParser.parse_xml_dataset(filename)
        if not chunks:
            return "No data found to ingest."
        texts = [chunk["text"] for chunk in chunks]
        metadatas = [chunk["metadata"] for chunk in chunks]
        vector_embeddings = self.embeddings.embed_documents(texts)

        points = [
            PointStruct(
                id=str(uuid.uuid4()), vector=vector, payload={"text": text, **meta}
            )
            for vector, text, meta in zip(vector_embeddings, texts, metadatas)
        ]

        self.qdrant.upsert(collection_name=self.collection_name, points=points)
        return (
            f"Successfully embedded {len(points)} records into Qdrant Vector Database."
        )
