from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./data/route53.db"
    SESSION_TTL_HOURS: int = 8
    # Send the session cookie only over HTTPS. Leave True in production; set COOKIE_SECURE=false for plain-HTTP local use.
    COOKIE_SECURE: bool = True
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
