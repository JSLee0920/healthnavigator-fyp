from qdrant_client import QdrantClient
from langchain_huggingface import HuggingFaceEmbeddings
from transformers import pipeline
from app.core.config import settings
from app.db.neo4j_client import get_neo4j_session

sync_qdrant = QdrantClient(url=settings.QDRANT_URL)
embeddings_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

ner_pipeline = pipeline(
    "ner", model="d4data/biomedical-ner-all", aggregation_strategy="simple"
)


async def search_healthcare_guidelines(query: str) -> str:
    """Search Qdrant for clinical guidelines based on user symptoms."""
    try:
        query_vector = embeddings_model.embed_query(query)
        results = sync_qdrant.search(
            collection_name="healthcare_info", query_vector=query_vector, limit=3
        )
        if not results:
            return "No specific guidelines found for this query."
        return "\n".join([res.payload.get("text", "") for res in results])
    except Exception as e:
        return f"Database error: {str(e)}"


async def search_knowledge_graph(user_sentence: str) -> str:
    """
    Pass the user's raw input sentence here. This tool will run a dedicated NER
    model to extract medical entities, and then search the Neo4j Knowledge Graph
    for relationships regarding those specific entities.
    """
    try:
        # Step 1: Run NER Extraction
        ner_results = ner_pipeline(user_sentence)

        # Filter for relevant medical tags (adjust these based on your specific model's labels)
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
        with get_neo4j_session() as session:
            for entity in extracted_entities:
                cypher_query = """
                MATCH (n)-[r]-(m) 
                WHERE toLower(n.name) CONTAINS toLower($entity) 
                RETURN n.name AS Source, type(r) AS Relationship, m.name AS Target
                LIMIT 3
                """
                result = session.run(cypher_query, entity=entity.strip())
                records = [
                    f"{record['Source']} -> {record['Relationship']} -> {record['Target']}"
                    for record in result
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
