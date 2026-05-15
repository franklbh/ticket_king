from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, health, test_db
from app.core.config import settings

API_V1_PREFIX = "/api/v1"
APP_NAME = "Ticket King API"


def create_app() -> FastAPI:
    app = FastAPI(title=APP_NAME)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.backend_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix=API_V1_PREFIX)
    app.include_router(test_db.router)
    app.include_router(auth.router)

    return app


app = create_app()
