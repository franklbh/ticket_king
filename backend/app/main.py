from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import alphapay, auth, health, shows, stripe_pay, test_db
from app.api.routes.admin import catalog as admin_catalog
from app.api.routes.admin import dashboard as admin_dashboard
from app.api.routes.admin import health as admin_health
from app.api.routes.admin import logs as admin_logs
from app.api.routes.admin import orders as admin_orders
from app.api.routes.admin import scanner as admin_scanner
from app.api.routes.admin import tickets as admin_tickets
from app.api.routes.admin import users as admin_users
from app.core.config import settings

API_V1_PREFIX = settings.api_v1_prefix
ADMIN_API_PREFIX = f"{API_V1_PREFIX}/admin"
APP_NAME = settings.app_name


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
    app.include_router(alphapay.router, prefix=API_V1_PREFIX)
    app.include_router(stripe_pay.router, prefix=API_V1_PREFIX)
    app.include_router(shows.router, prefix=API_V1_PREFIX)
    app.include_router(admin_health.router, prefix=ADMIN_API_PREFIX)
    app.include_router(admin_dashboard.router, prefix=ADMIN_API_PREFIX)
    app.include_router(admin_orders.router, prefix=ADMIN_API_PREFIX)
    app.include_router(admin_tickets.router, prefix=ADMIN_API_PREFIX)
    app.include_router(admin_catalog.router, prefix=ADMIN_API_PREFIX)
    app.include_router(admin_scanner.router, prefix=ADMIN_API_PREFIX)
    app.include_router(admin_logs.router, prefix=ADMIN_API_PREFIX)
    app.include_router(admin_users.router, prefix=ADMIN_API_PREFIX)
    app.include_router(test_db.router)
    app.include_router(auth.router)

    return app


app = create_app()
