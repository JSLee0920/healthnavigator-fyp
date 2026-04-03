import uuid
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from langchain_huggingface import HuggingFaceEmbeddings
from gliner import GLiNER

from app.core.config import settings
from app.db.neo4j_client import neo4j_driver
from app.services.ingestion.parser import UniversalDataParser


class DatasetEmbedder:
    def __init__(self):
        # Qdrant & Embedding Models
        self.qdrant = AsyncQdrantClient(url=settings.QDRANT_URL)
        self.collection_name = "healthcare_info"
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

        print("Loading local GLiNER model for Knowledge Graph extraction...")
        self.gliner_model = GLiNER.from_pretrained("urchade/gliner_small-v2")
        self.ner_labels = ["Symptom", "BodyPart", "Medication", "MedicalCondition"]

    async def ingest_dataset(self, filename: str) -> str:
        """Main pipeline to parse, embed, and graph a dataset."""
        print(f"Routing {filename} through Universal Parser...")
        chunks = UniversalDataParser.load_file(filename)

        if not chunks:
            print("No data extracted. Aborting ingestion.")
            return "No data extracted."

        await self._ensure_qdrant_collection()

        print(f"Uploading {len(chunks)} semantic chunks to Qdrant...")
        await self._upload_to_qdrant(chunks)

        await self._build_knowledge_graph(chunks)

        return (
            f"Successfully processed and ingested {len(chunks)} chunks from {filename}"
        )

    async def _ensure_qdrant_collection(self):
        """Creates the Qdrant collection if it doesn't exist."""
        collections = await self.qdrant.get_collections()
        exists = any(c.name == self.collection_name for c in collections.collections)

        if not exists:
            print(f"Creating new Qdrant collection: {self.collection_name}")
            await self.qdrant.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )

    async def _upload_to_qdrant(self, chunks: list[dict]):
        """Embeds text and uploads to Qdrant using deterministic IDs."""
        texts = [chunk["text"] for chunk in chunks]
        metadatas = [chunk["metadata"] for chunk in chunks]
        vector_embeddings = self.embeddings.embed_documents(texts)

        points = []
        for vector, text, meta in zip(vector_embeddings, texts, metadatas):
            # Generate a consistent ID based on the text itself (prevents duplication)
            deterministic_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, text))

            points.append(
                PointStruct(
                    id=deterministic_id, vector=vector, payload={"text": text, **meta}
                )
            )

        await self.qdrant.upsert(collection_name=self.collection_name, points=points)

    async def _build_knowledge_graph(self, chunks: list[dict]):
        """Extracts entities locally with GLiNER and builds Neo4j relationships."""
        print("Constructing Neo4j Knowledge Graph using local GLiNER model...")

        async with neo4j_driver.session() as session:
            for chunk in chunks:
                try:
                    text = chunk["text"]

                    # Extract the Title from the chunk text (formatted as "Topic: Title\nSummary:...")
                    title_line = text.split("\n")[0]
                    topic_title = title_line.replace("Topic: ", "").strip()

                    # Run local GLiNER extraction
                    entities = self.gliner_model.predict_entities(text, self.ner_labels)

                    if not entities:
                        continue

                    # Define the safe async Neo4j write transaction
                    async def write_graph(tx, title, extracted_entities):
                        # 1. Create the central Topic node
                        await tx.run("MERGE (t:Topic {title: $title})", title=title)

                        # 2. Link all extracted entities to the Topic
                        for ent in extracted_entities:
                            label = ent["label"].replace(" ", "")
                            ename = ent["text"].lower()

                            query = f"""
                                MERGE (e:{label} {{name: $ename}})
                                WITH e
                                MATCH (t:Topic {{title: $title}})
                                MERGE (t)-[:MENTIONS]->(e)
                            """
                            await tx.run(query, ename=ename, title=title)

                    await session.execute_write(write_graph, topic_title, entities)

                except Exception as e:
                    print(f"GLiNER Graphing failed on chunk '{topic_title}': {e}")
                    continue

        print("Ingestion 100% Complete! Qdrant and Neo4j are fully loaded.")
