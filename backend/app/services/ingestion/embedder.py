import uuid
from langchain_text_splitters import RecursiveCharacterTextSplitter
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from langchain_huggingface import HuggingFaceEmbeddings
from gliner import GLiNER

from app.core.config import settings
from app.db.neo4j_client import neo4j_driver
from app.services.ingestion.parser import UniversalDataParser


class DatasetEmbedder:
    def __init__(self, collection_name: str = "healthcare_info"):
        # Qdrant & Embedding Models
        self.qdrant = AsyncQdrantClient(url=settings.QDRANT_URL)
        self.collection_name = collection_name
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
        print("Chunking massive summaries to respect embedding limits...")

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,  # Characters per chunk (safe for MiniLM)
            chunk_overlap=100,  # 100 char overlap so sentences aren't cut in half
            separators=["\n\n", "\n", ". ", " "],  # Tries to split on paragraphs first
        )

        split_texts = []
        split_metadatas = []

        # Process every extracted topic
        for chunk in chunks:
            # Break the massive summary into safe, 800-character blocks
            sub_chunks = text_splitter.split_text(chunk["text"])
            for sub in sub_chunks:
                split_texts.append(sub)
                split_metadatas.append(chunk["metadata"])

        print(f"Split {len(chunks)} topics into {len(split_texts)} searchable chunks.")

        vector_embeddings = self.embeddings.embed_documents(split_texts)

        points = []
        for vector, text, meta in zip(vector_embeddings, split_texts, split_metadatas):
            # Generate a consistent ID based on the text itself
            deterministic_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, text))

            points.append(
                PointStruct(
                    id=deterministic_id, vector=vector, payload={"text": text, **meta}
                )
            )

        print(f"Uploadin g{len(points)} vectors to Qdrant in batches...")
        batch_size = 500

        for i in range(0, len(points), batch_size):
            # Slice the massive list into a chunk of 500
            batch = points[i : i + batch_size]

            # Upsert just this small batch
            await self.qdrant.upsert(collection_name=self.collection_name, points=batch)
            print(f" -> Successfully uploaded batch {i} to {i + len(batch)}")

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
