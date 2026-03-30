from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct
from langchain_huggingface import HuggingFaceEmbeddings
from transformers import pipeline
from langchain_groq import ChatGroq
from pydantic import SecretStr
from typing import cast, LiteralString, Any
import uuid
import json

from app.core.config import settings
from app.services.ingestion.parser import UniversalDataParser
from app.db.neo4j_client import get_neo4j_session


class DatasetEmbedder:
    def __init__(self):
        #  Qdrant Setup
        self.qdrant = QdrantClient(url=settings.QDRANT_URL)
        self.collection_name = "healthcare_info"
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self._ensure_qdrant_collection()

        #  Neo4j & Graph Setup
        self.ner_pipeline: Any = pipeline(
            task="ner", model="d4data/biomedical-ner-all", aggregation_strategy="simple"
        )

        self.llm = ChatGroq(
            temperature=0,
            api_key=SecretStr(settings.GROQ_API_KEY),
            model="llama-3.3-70b-versatile",
        )

    def _ensure_qdrant_collection(self):
        collections = self.qdrant.get_collections().collections
        if not any(c.name == self.collection_name for c in collections):
            self.qdrant.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )

    def ingest_dataset(self, filename: str):
        print(f"Routing {filename} through Universal Parser...")
        chunks = UniversalDataParser.load_file(filename)
        if not chunks:
            return "No data found to ingest."

        print(f"Uploading {len(chunks)} semantic chunks to Qdrant...")
        self._upload_to_qdrant(chunks)

        print("Constructing Neo4j Knowledge Graph...")
        self._build_knowledge_graph(chunks)

        return f"Successfully processed {filename} into both Qdrant and Neo4j."

    def _upload_to_qdrant(self, chunks: list[dict]):
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

    def _build_knowledge_graph(self, chunks: list[dict]):
        target_tags = ["Sign_symptom", "Disease_disorder", "Medication"]

        valid_relations = {
            "TREATS",
            "CAUSES",
            "PRESENTS_WITH",
            "ASSOCIATED_WITH",
            "PREVENTS",
            "INCREASES_RISK",
        }

        with get_neo4j_session() as session:
            for chunk in chunks:
                text = chunk["text"]

                try:
                    ner_results = self.ner_pipeline(
                        text, truncation=True, max_length=512
                    )
                except Exception as e:
                    print(f"NER Pipeline failed on chunk: {e}")
                    continue

                entities = list(
                    set(
                        [
                            ent["word"].title()
                            for ent in ner_results
                            if ent["entity_group"] in target_tags
                        ]
                    )
                )

                if len(entities) < 2:
                    continue

                prompt = f"""
                Analyze this medical text: "{text}"
                Identify relationships between these specific entities: {entities}.
                Return ONLY a valid JSON array of objects with keys 'source', 'target', and 'relation' (use uppercase for relation, e.g., TREATS, CAUSES, PRESENTS_WITH).
                """

                try:
                    llm_response = self.llm.invoke(prompt)

                    content = llm_response.content
                    content_str = content if isinstance(content, str) else str(content)
                    json_str = (
                        content_str.replace("```json", "").replace("```", "").strip()
                    )

                    triples = json.loads(json_str)

                    for triple in triples:
                        raw_relation = str(
                            triple.get("relation", "ASSOCIATED_WITH")
                        ).upper()
                        safe_relation = (
                            raw_relation
                            if raw_relation in valid_relations
                            else "ASSOCIATED_WITH"
                        )

                        raw_query = f"""
                        MERGE (s:MedicalEntity {{name: $source}})
                        MERGE (t:MedicalEntity {{name: $target}})
                        MERGE (s)-[r:{safe_relation}]->(t)
                        """

                        secure_query = cast(LiteralString, raw_query)

                        session.run(
                            secure_query,
                            source=triple["source"],
                            target=triple["target"],
                        )

                except Exception as e:
                    print(f"Skipping chunk due to LLM parsing error: {e}")
                    continue
