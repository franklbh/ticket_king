from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Ticket King API"
    app_env: str = "local"
    api_v1_prefix: str = "/api/v1"
    backend_cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None

    # Alphapay — replace placeholders once credentials are received
    alphapay_partner_code: str = "YOUR_PARTNER_CODE"
    # Set one of these: path to PEM file (local dev) or raw PEM content (production)
    alphapay_private_key_path: str | None = None
    alphapay_private_key_pem: str | None = None
    # Public-facing URL of this backend so Alphapay/Stripe can reach webhooks
    webhook_base_url: str = "http://localhost:8000"

    # Stripe
    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None

    @field_validator("backend_cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
