import asyncio
from qdrant_client import AsyncQdrantClient
from app.core.config import settings
from app.db.neo4j_client import neo4j_driver
from app.services.ml_models import NER_LABELS, get_embeddings, get_gliner_model
from typing import List, Tuple

async_qdrant = AsyncQdrantClient(url=settings.QDRANT_URL)
embeddings_model = get_embeddings()


async def search_healthcare_guidelines(query: str) -> Tuple[str, List[str]]:
    """Search Qdrant for clinical guidelines based on user symptoms."""
    try:
        query_vector = embeddings_model.embed_query(query)
        response = await async_qdrant.query_points(
            collection_name=settings.QDRANT_COLLECTION, query=query_vector, limit=3
        )
        if not response.points:
            return "No specific guidelines found for this query.", []

        texts = []
        sources = []

        for res in response.points:
            payload = res.payload or {}
            texts.append(payload.get("text", ""))

            doc_source = payload.get("source", "Unknown Medical Document")
            sources.append(doc_source)

        return "\n".join(texts), sources

    except Exception as e:
        return f"Database error: {str(e)}", []


async def search_knowledge_graph(user_sentence: str) -> Tuple[str, List[str]]:
    """
    Pass the user's raw input sentence here. This tool runs the shared GLiNER
    NER model to extract medical entities, and then searches the Neo4j
    Knowledge Graph for relationships regarding those specific entities.

    GLiNER and the same label set are used here as in the ingestion pipeline
    (see app.services.ml_models), so query-time entities line up with the
    nodes written when the graph was built.
    """
    try:
        gliner_model = get_gliner_model()

        words = user_sentence.split()
        chunk_size = 250

        ner_results = []
        for i in range(0, len(words), chunk_size):
            sub_text = " ".join(words[i : i + chunk_size])
            if sub_text.strip():
                chunk_result = await asyncio.to_thread(
                    gliner_model.predict_entities, sub_text, NER_LABELS
                )
                ner_results.extend(chunk_result)

        extracted_entities = [ent["text"] for ent in ner_results]

        if not extracted_entities:
            return (
                "NER did not detect any strict medical entities in this query to search the graph.",
                [],
            )

        graph_responses = []
        async with neo4j_driver.session() as session:
            for entity in extracted_entities:
                cypher_query = """
                MATCH (e1)<-[:MENTIONS]-(t:Topic)-[:MENTIONS]->(e2)
                WHERE toLower(e1.name) CONTAINS toLower($entity) AND e1 <> e2
                RETURN e1.name AS Source, t.title AS Via, e2.name AS Target
                LIMIT 3
                """
                result = await session.run(cypher_query, entity=entity.strip())
                records = [
                    f"{record['Source']} (mentioned in '{record['Via']}') -> {record['Target']}"
                    async for record in result
                ]

                if records:
                    graph_responses.append(
                        f"Relationships for '{entity}':\n" + "\n".join(records)
                    )

        if not graph_responses:
            return (
                f"NER extracted {extracted_entities}, but no relationships were found in the graph.",
                [],
            )

        return "\n\n".join(graph_responses), ["Clinical Knowledge Graph"]

    except Exception as e:
        return f"Knowledge Graph Error: {str(e)}", []


async def fetch_user_profile(user_id: str) -> str:
    """Fetch the user's existing health profile and conditions."""
    from datetime import datetime as dt
    from app.db.postgres_client import AsyncSessionLocal
    from app.models.schema import HealthProfile
    from sqlalchemy.future import select

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(HealthProfile).where(HealthProfile.user_id == user_id)
        )
        profile = result.scalars().first()

        if not profile:
            return f"No health profile found for user {user_id}"

        parts = []

        if profile.gender:
            parts.append(f"Gender: {profile.gender}")

        if profile.date_of_birth:
            dob = profile.date_of_birth
            if hasattr(dob, "date"):
                dob = dob.date()
            today = dt.now().date()
            age = (
                today.year
                - dob.year
                - ((today.month, today.day) < (dob.month, dob.day))
            )
            parts.append(f"Age: {age} years")

        if profile.height_cm and profile.weight_kg:
            bmi = round(profile.weight_kg / ((profile.height_cm / 100) ** 2), 1)
            parts.append(f"BMI: {bmi}")

        if profile.blood_type:
            parts.append(f"Blood Type: {profile.blood_type}")

        for label, field in [
            ("Conditions", profile.chronic_conditions),
            ("Allergies", profile.allergies),
            ("Medications", profile.current_medications),
        ]:
            if field:
                parts.append(f"{label}: {', '.join(field)}")

        if profile.lifestyle_factors:
            factors = [f"{k}: {v}" for k, v in profile.lifestyle_factors.items()]
            if factors:
                parts.append(f"Lifestyle: {', '.join(factors)}")

        if parts:
            return "User Health Profile:\n" + "\n".join(parts)
        return f"No health profile data for user {user_id}"
