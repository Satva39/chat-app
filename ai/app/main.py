from fastapi import FastAPI

from dotenv import load_dotenv

from .config import (
    AI_SERVICE_NAME,
    AI_SERVICE_VERSION,
)
from .routes.health import router as health_router
from .routes.internal import router as internal_router
from .routes.chat import router as chat_router

load_dotenv()

app = FastAPI(
    title=AI_SERVICE_NAME,
    version=AI_SERVICE_VERSION,
)


app.include_router(health_router)
app.include_router(internal_router)
app.include_router(chat_router)
