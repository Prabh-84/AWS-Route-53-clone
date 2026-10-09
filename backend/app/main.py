from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.routers import auth, health, hosted_zones, records

API_PREFIX = "/api/v1"


def create_app() -> FastAPI:
    app = FastAPI(title="Route 53 Clone API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)
    app.include_router(health.router, prefix=API_PREFIX)
    app.include_router(auth.router, prefix=API_PREFIX)
    app.include_router(hosted_zones.router, prefix=API_PREFIX)
    app.include_router(records.router, prefix=API_PREFIX)
    return app


app = create_app()
