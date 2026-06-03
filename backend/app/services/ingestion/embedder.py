import uuid
from langchain_text_splitters import RecursiveCharacterTextSplitter
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, PayloadSchemaType, PointStruct, VectorParams

from app.core.config import settings
from app.db.neo4j_client import neo4j_driver
from app.services.ingestion.parser import UniversalDataParser
from app.services.ml_models import NER_LABELS, get_embeddings, get_gliner_model


class DatasetEmbedder:
    def __init__(self, collection_name: str | None = None):
        # Qdrant & Embedding Models
        self.qdrant = AsyncQdrantClient(url=settings.QDRANT_URL)
        self.collection_name = collection_name or settings.QDRANT_COLLECTION
        self.embeddings = get_embeddings()
        self.gliner_model = get_gliner_model()
        self.ner_labels = NER_LABELS

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

        # Idempotent keyword index on `source` so admin deletes can filter
        # vectors by filename without scanning the whole collection.
        try:
            await self.qdrant.create_payload_index(
                collection_name=self.collection_name,
                field_name="source",
                field_schema=PayloadSchemaType.KEYWORD,
            )
        except Exception as e:
            print(f"Qdrant payload index on 'source' not (re)created: {e}")

    async def _upload_to_qdrant(self, chunks: list[dict]):
        print("Chunking massive summaries to respect embedding limits...")

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=100,
            separators=["\n\n", "\n", ". ", " "],
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
        print(
            f"Constructing Neo4j Knowledge Graph for {len(chunks)} chunks using local GLiNER..."
        )

        async with neo4j_driver.session() as session:
            for i, chunk in enumerate(chunks):
                try:
                    text = chunk["text"]
                    metadata = chunk["metadata"]

                    source_name = metadata.get("source", "Unknown_Document")

                    if text.startswith("Topic: "):
                        topic_title = text.split("\n")[0].replace("Topic: ", "").strip()
                    else:
                        page_num = metadata.get("page_number", "Unknown_Page")
                        topic_title = f"{source_name} (Page {page_num})"

                    entities = self.gliner_model.predict_entities(text, self.ner_labels)

                    if not entities:
                        continue

                    async def write_graph(tx, title, source, extracted_entities):
                        await tx.run(
                            "MERGE (t:Topic {title: $title, source: $source})",
                            title=title,
                            source=source,
                        )

                        for ent in extracted_entities:
                            label = ent["label"].replace(" ", "")
                            ename = ent["text"].lower()

                            query = f"""
                                MERGE (e:{label} {{name: $ename}})
                                WITH e
                                MATCH (t:Topic {{title: $title, source: $source}})
                                MERGE (t)-[:MENTIONS]->(e)
                            """
                            await tx.run(query, ename=ename, title=title, source=source)

                    await session.execute_write(
                        write_graph, topic_title, source_name, entities
                    )

                    if (i + 1) % 100 == 0:
                        print(
                            f" -> Neo4j Graphing: Processed {i + 1}/{len(chunks)} chunks..."
                        )

                except Exception as e:
                    print(f"GLiNER Graphing failed on chunk {i}: {e}")
                    continue

        print("Ingestion 100% Complete! Qdrant and Neo4j are fully loaded.")
