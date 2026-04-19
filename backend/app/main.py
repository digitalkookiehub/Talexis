import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.exceptions import AppException

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="AI-powered talent intelligence platform",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Serve uploaded files (profile pictures, resumes) as static files
import os
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "code": exc.code},
    )


@app.get("/health")
async def health() -> dict:
    return {"status": "healthy", "app": settings.APP_NAME}


# Register routers — using try/except so missing routers don't block startup
def _include_router(module_path: str, prefix: str, tags: list[str]) -> None:
    try:
        import importlib
        module = importlib.import_module(module_path)
        app.include_router(module.router, prefix=prefix, tags=tags)
        logger.info("Loaded router: %s", module_path)
    except (ImportError, AttributeError) as e:
        logger.warning("Router not available: %s (%s)", module_path, e)


_include_router("app.routers.auth", "/api/v1", ["auth"])
_include_router("app.routers.students", "/api/v1", ["students"])
_include_router("app.routers.interviews", "/api/v1", ["interviews"])
_include_router("app.routers.evaluations", "/api/v1", ["evaluations"])
_include_router("app.routers.readiness", "/api/v1", ["readiness"])
_include_router("app.routers.talents", "/api/v1", ["talents"])
_include_router("app.routers.companies", "/api/v1", ["companies"])
_include_router("app.routers.jobs", "/api/v1", ["jobs"])
_include_router("app.routers.matching", "/api/v1", ["matching"])
_include_router("app.routers.learning", "/api/v1", ["learning"])
_include_router("app.routers.admin", "/api/v1", ["admin"])
_include_router("app.routers.analytics", "/api/v1", ["analytics"])
_include_router("app.routers.anticheat", "/api/v1", ["anticheat"])
_include_router("app.routers.college", "/api/v1", ["college"])
_include_router("app.routers.schedules", "/api/v1", ["schedules"])
_include_router("app.routers.payments", "/api/v1", ["payments"])
