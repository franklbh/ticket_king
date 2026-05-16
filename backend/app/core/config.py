import json
from pathlib import Path

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "Ticket King API"
    app_env: str = "local"
    api_v1_prefix: str = "/api/v1"
    backend_cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5175",
            "http://127.0.0.1:5175",
            "http://localhost:3000",
        ],
    )
    database_url: str | None = None
    db_user: str | None = Field(default=None, validation_alias=AliasChoices("DB_USER", "POSTGRES_USER"))
    db_password: str | None = Field(default=None, validation_alias=AliasChoices("DB_PASSWORD", "POSTGRES_PASSWORD"))
    db_host: str | None = Field(default=None, validation_alias=AliasChoices("DB_HOST", "POSTGRES_HOST"))
    db_port: int = Field(default=5432, validation_alias=AliasChoices("DB_PORT", "POSTGRES_PORT"))
    db_name: str = Field(default="postgres", validation_alias=AliasChoices("DB_NAME", "POSTGRES_DB"))
    supabase_url: str | None = None
    supabase_publishable_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY"),
    )
    supabase_service_role_key: str | None = None
    supabase_auth_users_table: str = "auth.users"

    admin_orders_table: str = "orders"
    admin_tickets_table: str = "tickets"
    admin_slots_table: str = "slots"
    admin_ticket_types_table: str = "ticket_types"
    admin_events_table: str = "events"
    admin_coupons_table: str = "coupons"
    admin_marketing_settings_table: str = "marketing_settings"
    admin_marketing_records_table: str = "marketing_records"
    admin_audit_logs_table: str = "audit_logs"
    admin_users_table: str = "users"
    admin_default_timezone: str = "America/Vancouver"
    admin_bootstrap_token: str | None = None

    admin_order_id_column: str = "id"
    admin_ticket_id_column: str = "id"
    admin_ticket_status_column: str = "ticket_status"
    max_table_rows: int = 10000

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
        enable_decoding=False,
    )


settings = Settings()
