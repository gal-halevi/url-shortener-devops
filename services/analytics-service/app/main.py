from fastapi import FastAPI
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from app.api.v1 import analytics
from app.core.config import settings
from app.core.database import engine
from app.models.click_event import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown (if needed)
    pass


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)

# Include routers
app.include_router(
    analytics.router,
    prefix=f"{settings.API_V1_PREFIX}/analytics",
    tags=["analytics"]
)


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }