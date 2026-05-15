import json
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    backend_cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
        ],
    )
    database_url: str | None = None
    db_user: str | None = None
    db_password: str | None = None
    db_host: str | None = None
    db_port: int = 5432
    db_name: str = "postgres"
    supabase_url: str | None = None

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
    def parse_cors_origins(cls, value: str | list[str]) -> list[str] | str:
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("["):
                return json.loads(value)
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
