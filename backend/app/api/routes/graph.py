from fastapi import APIRouter, Depends, HTTPException, Query
from neo4j import AsyncSession as Neo4jAsyncSession
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.dependencies import get_current_user
from app.db.neo4j_client import get_neo4j_session
from app.db.postgres_client import get_db
from app.models.schema import HealthProfile, User

router = APIRouter(prefix="/graph", tags=["Graph"])

# Soft caps so the force-graph stays usable on the client.
MAX_NEIGHBORS_PER_SEED = 10
MAX_TOTAL_NODES = 100


class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    origin: str  # "user" | "related" | "search"


class GraphEdge(BaseModel):
    source: str
    target: str
    type: str


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


def _node_id(name: str) -> str:
    return (name or "").strip().lower()


def _pick_type(labels: list[str] | None) -> str:
    if not labels:
        return "Unknown"
    priority = ["Symptom", "MedicalCondition", "Medication", "BodyPart"]
    for p in priority:
        if p in labels:
            return p
    return labels[0]


async def _expand_seed(
    neo: Neo4jAsyncSession,
    seed: str,
    seed_origin: str,
    nodes: dict[str, GraphNode],
    edges: list[GraphEdge],
    seed_type: str = "UserEntity",
) -> None:
    """Insert the seed node, then add up to MAX_NEIGHBORS_PER_SEED neighbors."""
    seed_id = _node_id(seed)
    if not seed_id:
        return

    # Include the seed itself so an empty Cypher result still shows the
    # user's own conditions.
    if seed_id not in nodes:
        nodes[seed_id] = GraphNode(
            id=seed_id, label=seed.strip(), type=seed_type, origin=seed_origin
        )

    cypher = """
    MATCH (n)-[r]-(m)
    WHERE toLower(n.name) CONTAINS toLower($seed)
    RETURN n.name AS source, labels(n) AS source_labels,
           type(r) AS rel,
           m.name AS target, labels(m) AS target_labels
    LIMIT $limit
    """
    try:
        result = await neo.run(cypher, seed=seed.strip(), limit=MAX_NEIGHBORS_PER_SEED)
        async for record in result:
            if len(nodes) >= MAX_TOTAL_NODES:
                break
            src_name = record["source"]
            tgt_name = record["target"]
            if not src_name or not tgt_name:
                continue

            src_id = _node_id(src_name)
            tgt_id = _node_id(tgt_name)

            if src_id not in nodes:
                nodes[src_id] = GraphNode(
                    id=src_id,
                    label=src_name,
                    type=_pick_type(record["source_labels"]),
                    origin="related" if src_id != seed_id else seed_origin,
                )
            if tgt_id not in nodes:
                nodes[tgt_id] = GraphNode(
                    id=tgt_id,
                    label=tgt_name,
                    type=_pick_type(record["target_labels"]),
                    origin="related",
                )
            edges.append(GraphEdge(source=src_id, target=tgt_id, type=record["rel"]))
    except Exception as e:
        print(f"Graph expand failed for seed '{seed}': {e}")


@router.get("/me", response_model=GraphResponse)
async def get_user_graph(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    neo: Neo4jAsyncSession = Depends(get_neo4j_session),
):
    """User-personalized graph seeded from HealthProfile arrays."""
    result = await db.execute(
        select(HealthProfile).where(HealthProfile.user_id == current_user.user_id)
    )
    profile = result.scalars().first()

    nodes: dict[str, GraphNode] = {}
    edges: list[GraphEdge] = []

    if not profile:
        return GraphResponse(nodes=[], edges=[])

    seeds: list[tuple[str, str]] = []
    for cond in profile.chronic_conditions or []:
        seeds.append((cond, "MedicalCondition"))
    for med in profile.current_medications or []:
        seeds.append((med, "Medication"))
    for allergy in profile.allergies or []:
        seeds.append((allergy, "Allergy"))

    for seed, seed_type in seeds:
        if len(nodes) >= MAX_TOTAL_NODES:
            break
        await _expand_seed(
            neo, seed, seed_origin="user", nodes=nodes, edges=edges, seed_type=seed_type
        )

    return GraphResponse(nodes=list(nodes.values()), edges=edges)


@router.get("/search", response_model=GraphResponse)
async def search_graph(
    q: str = Query(..., min_length=1, max_length=100),
    current_user: User = Depends(get_current_user),
    neo: Neo4jAsyncSession = Depends(get_neo4j_session),
):
    """General exploration: seed = arbitrary term, no user-scoping."""
    nodes: dict[str, GraphNode] = {}
    edges: list[GraphEdge] = []

    await _expand_seed(
        neo, q, seed_origin="search", nodes=nodes, edges=edges, seed_type="Topic"
    )

    if not nodes:
        raise HTTPException(
            status_code=404, detail=f"No graph entities found for '{q}'."
        )

    return GraphResponse(nodes=list(nodes.values()), edges=edges)
