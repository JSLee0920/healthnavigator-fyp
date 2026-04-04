import asyncio
from qdrant_client import AsyncQdrantClient
from langchain_huggingface import HuggingFaceEmbeddings
from transformers import pipeline
from app.core.config import settings
from app.db.neo4j_client import neo4j_driver

async_qdrant = AsyncQdrantClient(url=settings.QDRANT_URL)
embeddings_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

ner_pipeline = pipeline(
    "ner", model="d4data/biomedical-ner-all", aggregation_strategy="simple"
)


async def search_healthcare_guidelines(query: str) -> str:
    """Search Qdrant for clinical guidelines based on user symptoms."""
    try:
        query_vector = embeddings_model.embed_query(query)
        response = await async_qdrant.query_points(
            collection_name="healthcare_info", query=query_vector, limit=3
        )
        if not response.points:
            return "No specific guidelines found for this query."

        return "\n".join(
            [(res.payload or {}).get("text", "") for res in response.points]
        )
    except Exception as e:
        return f"Database error: {str(e)}"


async def search_knowledge_graph(user_sentence: str) -> str:
    """
    Pass the user's raw input sentence here. This tool will run a dedicated NER
    model to extract medical entities, and then search the Neo4j Knowledge Graph
    for relationships regarding those specific entities.
    """
    try:
        words = user_sentence.split()
        chunk_size = 250

        ner_results = []
        for i in range(0, len(words), chunk_size):
            sub_text = " ".join(words[i : i + chunk_size])
            if sub_text.strip():
                chunk_result = await asyncio.to_thread(ner_pipeline, sub_text)
                ner_results.extend(chunk_result)

        target_tags = [
            "Sign_symptom",
            "Disease_disorder",
            "Medication",
            "Detailed_description",
        ]
        extracted_entities = [
            ent["word"] for ent in ner_results if ent["entity_group"] in target_tags
        ]

        if not extracted_entities:
            return "NER did not detect any strict medical entities in this query to search the graph."

        # Step 2: Query Neo4j for the extracted entities
        graph_responses = []
        async with neo4j_driver.session() as session:
            for entity in extracted_entities:
                cypher_query = """
                MATCH (n)-[r]-(m) 
                WHERE toLower(n.name) CONTAINS toLower($entity) 
                RETURN n.name AS Source, type(r) AS Relationship, m.name AS Target
                LIMIT 3
                """
                result = await session.run(cypher_query, entity=entity.strip())
                records = [
                    f"{record['Source']} -> {record['Relationship']} -> {record['Target']}"
                    async for record in result
                ]

                if records:
                    graph_responses.append(
                        f"Relationships for '{entity}':\n" + "\n".join(records)
                    )

        if not graph_responses:
            return f"NER extracted {extracted_entities}, but no relationships were found in the graph."

        return "\n\n".join(graph_responses)

    except Exception as e:
        return f"Knowledge Graph Error: {str(e)}"


async def fetch_user_profile(user_id: str) -> str:
    """Fetch the user's existing health profile and conditions."""
    return f"Retrieved profile for {user_id}: No known major allergies. Standard vitals"
