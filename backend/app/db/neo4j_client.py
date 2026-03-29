from neo4j import GraphDatabase
from app.core.config import settings

neo4j_driver = GraphDatabase.driver(
    settings.NEO4J_URI, auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
)


def get_neo4j_session():
    return neo4j_driver.session()
