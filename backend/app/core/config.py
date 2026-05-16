from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    PROJECT_NAME: str = "HealthNavigator"
    VERSION: str = "1.0.0"

    DATA_DIR: Path = _REPO_ROOT / "data"
    UPLOAD_DIR: Path = _REPO_ROOT / "data" / "raw_data"

    # Per-step pause for the ingestion WS log stream. 0 = no delay (prod
    # default). Set >0 for demo runs where each pipeline step should remain
    # on-screen long enough to read.
    INGESTION_STEP_DELAY_SECONDS: float = 0.0

    GROQ_API_KEY: str

    DATABASE_URL: str
    QDRANT_URL: str
    QDRANT_COLLECTION: str = "healthcare_info"
    NEO4J_URI: str
    NEO4J_USER: str
    NEO4J_PASSWORD: str

    # JWT security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    ADMIN_CREATION_SECRET: str

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
