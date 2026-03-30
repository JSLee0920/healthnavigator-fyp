from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from app.api.routes import users, chat, admin, auth

    app.include_router(users.router)
    app.include_router(chat.router)
    app.include_router(admin.router)
    app.include_router(auth.router)

    @app.get("/health")
    async def health_check():
        return {"status": "online"}

    return app


app = create_app()
