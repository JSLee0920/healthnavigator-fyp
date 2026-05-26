"""Shared, lazily-loaded ML models.

Both the ingestion pipeline (which builds the knowledge graph) and the
query-time retriever (which searches it) need the same GLiNER NER model and
the same sentence-embedding model. Loading them here behind an `lru_cache`
makes each a process-wide singleton, so the models are loaded once on first
use and every caller reuses the same instance instead of paying the load
cost — and the memory — twice.
"""

from functools import lru_cache

from gliner import GLiNER
from langchain_huggingface import HuggingFaceEmbeddings

GLINER_MODEL_NAME = "urchade/gliner_small-v2"
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

NER_LABELS = ["Symptom", "BodyPart", "Medication", "MedicalCondition"]


@lru_cache(maxsize=1)
def get_gliner_model() -> GLiNER:
    """Return the shared GLiNER model, loading it on first call."""
    return GLiNER.from_pretrained(GLINER_MODEL_NAME)


@lru_cache(maxsize=1)
def get_embeddings() -> HuggingFaceEmbeddings:
    """Return the shared sentence-embedding model, loading it on first call."""
    return HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_NAME)
