import os

from fastapi import APIRouter, Header, HTTPException

router = APIRouter(
    prefix="/internal",
    tags=["Internal"],
)


@router.get("/ping")
def ping(
    x_ai_internal_token: str | None = Header(default=None),
):
    expected_token = os.getenv("AI_INTERNAL_TOKEN")

    if not expected_token:
        raise HTTPException(
            status_code=500,
            detail="AI internal token is not configured",
        )

    if x_ai_internal_token != expected_token:
        raise HTTPException(
            status_code=401,
            detail="Invalid AI internal token",
        )

    return {
        "status": "ok",
        "service": "ai",
        "message": "Python AI service is reachable",
    }
