from functools import lru_cache

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Ticket King Admin API"
    app_env: str = "local"
    api_v1_prefix: str = "/api/v1"
    backend_cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://localhost:3000"]
    )

    database_url: str | None = None
    db_user: str | None = Field(default=None, validation_alias=AliasChoices("user", "DB_USER", "POSTGRES_USER"))
    db_password: str | None = Field(default=None, validation_alias=AliasChoices("password", "DB_PASSWORD", "POSTGRES_PASSWORD"))
    db_host: str | None = Field(default=None, validation_alias=AliasChoices("host", "DB_HOST", "POSTGRES_HOST"))
    db_port: int = Field(default=5432, validation_alias=AliasChoices("port", "DB_PORT", "POSTGRES_PORT"))
    db_name: str = Field(default="postgres", validation_alias=AliasChoices("dbname", "DB_NAME", "POSTGRES_DB"))

    admin_orders_table: str = "orders"
    admin_tickets_table: str = "tickets"
    admin_slots_table: str = "slots"
    admin_ticket_types_table: str = "ticket_types"
    admin_audit_logs_table: str = "audit_logs"
    admin_users_table: str = "users"
    supabase_auth_users_table: str = "auth.users"
    admin_bootstrap_token: str | None = None

    admin_order_id_column: str = "order_id"
    admin_ticket_id_column: str = "ticket_id"
    admin_ticket_status_column: str = "ticket_status"

    default_currency: str = "CAD"
    default_timezone: str = "America/Vancouver"
    max_table_rows: int = 10000

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
        extra="ignore",
        enable_decoding=False,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
