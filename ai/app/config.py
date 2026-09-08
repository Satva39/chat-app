import os

from dotenv import load_dotenv

load_dotenv()


AI_SERVICE_NAME = os.getenv(
    "AI_SERVICE_NAME",
    "Chat App AI Service",
)

AI_SERVICE_VERSION = os.getenv(
    "AI_SERVICE_VERSION",
    "1.0.0",
)

AI_HOST = os.getenv(
    "AI_HOST",
    "127.0.0.1",
)

AI_PORT = int(
    os.getenv(
        "AI_PORT",
        "8000",
    )
)

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3")
