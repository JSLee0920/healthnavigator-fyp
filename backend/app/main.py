import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import update

from app.core.config import settings
from app.db.postgres_client import AsyncSessionLocal
from app.models.schema import Document

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Reconcile any document rows left in transient states by a previous
    # crashed/killed backend process. Without this they would stay stuck
    # forever and block re-upload of the same filename.
    try:
        async with AsyncSessionLocal() as db:
            stmt = (
                update(Document)
                .where(Document.status.in_(["processing", "deleting"]))
                .values(
                    status="failed",
                    error_msg="Backend restarted during ingestion or deletion",
                )
            )
            result = await db.execute(stmt)
            await db.commit()
            if result.rowcount:
                logger.info(
                    f"Reconciled {result.rowcount} stale document rows on startup"
                )
    except Exception as e:
        logger.error(f"Document startup reconciliation failed: {e}")

    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME, version=settings.VERSION, lifespan=lifespan
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from app.api.routes import users, chat, admin, auth, sessions

    app.include_router(users.router)
    app.include_router(chat.router)
    app.include_router(admin.router)
    app.include_router(auth.router)
    app.include_router(sessions.router)

    @app.get("/health")
    async def health_check():
        return {"status": "online"}

    return app


app = create_app()
