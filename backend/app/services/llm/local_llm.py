import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class LocalLLMService:
    def __init__(self) -> None:
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL

    async def generate(self, prompt: str, system: str = "") -> str:
        """Generate text using local Ollama model."""
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "system": system,
                        "stream": False,
                    },
                )
                response.raise_for_status()
                return response.json()["response"]
        except httpx.HTTPStatusError as e:
            logger.error("Ollama HTTP error: %s", e.response.status_code)
            raise
        except httpx.ConnectError:
            logger.error("Cannot connect to Ollama at %s", self.base_url)
            raise

    async def is_available(self) -> bool:
        """Check if Ollama is running and accessible."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception:
            return False


local_llm = LocalLLMService()
