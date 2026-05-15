from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import catalog, dashboard, health, orders, tickets, users
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.backend_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix=settings.api_v1_prefix)
    app.include_router(dashboard.router, prefix=settings.api_v1_prefix)
    app.include_router(orders.router, prefix=settings.api_v1_prefix)
    app.include_router(tickets.router, prefix=settings.api_v1_prefix)
    app.include_router(catalog.router, prefix=settings.api_v1_prefix)
    app.include_router(users.router, prefix=settings.api_v1_prefix)

    return app


app = create_app()
