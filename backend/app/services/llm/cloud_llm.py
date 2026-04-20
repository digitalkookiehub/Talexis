import json
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Store last usage for tracking (captured after each call)
_last_usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}


def get_last_usage() -> dict:
    return _last_usage.copy()


class CloudLLMService:
    def __init__(self) -> None:
        self._client = None
        self.model = settings.OPENAI_MODEL

    @property
    def client(self):
        if self._client is None:
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    async def evaluate(self, prompt: str, system: str = "") -> dict:
        """Evaluate using cloud LLM, returns parsed JSON."""
        global _last_usage
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
            )
            # Capture token usage
            if response.usage:
                _last_usage = {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                }
            content = response.choices[0].message.content
            return json.loads(content)
        except json.JSONDecodeError:
            logger.error("Failed to parse LLM response as JSON")
            raise
        except Exception as e:
            logger.error("Cloud LLM evaluation error: %s", str(e))
            raise

    async def generate(self, prompt: str, system: str = "") -> str:
        """Generate text using cloud LLM."""
        global _last_usage
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
            )
            if response.usage:
                _last_usage = {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                }
            return response.choices[0].message.content
        except Exception as e:
            logger.error("Cloud LLM generation error: %s", str(e))
            raise


cloud_llm = CloudLLMService()
