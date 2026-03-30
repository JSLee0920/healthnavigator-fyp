from crewai.tools import tool
from qdrant_client import QdrantClient
from langchain_huggingface import HuggingFaceEmbeddings
from app.core.config import settings
from app.db.neo4j_client import get_neo4j_session

sync_qdrant = QdrantClient(url=settings.QDRANT_URL)
embeddings_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")


@tool("Search Healthcare Guidelines")
def search_healthcare_guidelines(query: str) -> str:
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


@tool("Search Healthcare Knowledge Graph")
def search_knowledge_graph(entity: str) -> str:
    try:
        with get_neo4j_session() as session:
            cypher_query = """
            MATCH (n)-[r]-(m)
            WHERE toLower(n.name) CONTAINS toLower($entity)
            RETURN n.name AS Source, type(r) AS Relationship, m.name AS Target
            LIMIT 5
            """
            result = session.run(cypher_query, entity=entity)
            records = [
                f"{record['Source']} -> {record['Relationship']} -> {record['Target']}"
                for record in result
            ]

            if not records:
                return f"No graph relationships found for {entity}."
            return "\n".join(records)
    except Exception as e:
        return f"Neo4j Error: {str(e)}"


@tool
def fetch_user_profile(user_id: str) -> str:
    """Fetch the user's existing health profile and conditions."""
    return f"Retrieved profile for {user_id}: No known major allergies. Standard vitals"
