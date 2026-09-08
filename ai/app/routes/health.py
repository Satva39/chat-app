from fastapi import APIRouter

from ..config import (
    AI_SERVICE_NAME,
    AI_SERVICE_VERSION,
)

router = APIRouter(
    tags=["Health"],
)


@router.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai",
        "name": AI_SERVICE_NAME,
        "version": AI_SERVICE_VERSION,
    }
