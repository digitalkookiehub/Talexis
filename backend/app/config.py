from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Talexis"
    DATABASE_URL: str = "postgresql://talexis_user:password@localhost:5432/talexis"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    FRONTEND_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5300",
    ]

    # Ollama (Local LLM)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"

    # OpenAI (Cloud LLM)
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"

    # File Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 10

    class Config:
        env_file = ".env"


settings = Settings()
