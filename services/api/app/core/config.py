"""Application configuration via Pydantic Settings.

Environment variables are loaded from .env files.
Never hardcode secrets — always use env vars.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for the Sinalytix API."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────
    app_name: str = "Sinalytix API"
    app_version: str = "0.1.0"
    debug: bool = False
    environment: str = "development"  # development | staging | production

    # ── Database ─────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://sinalytix:sinalytix@localhost:5432/sinalytix"
    database_echo: bool = False

    # ── Redis ────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── Auth / JWT ───────────────────────────────────────
    jwt_secret_key: str = "CHANGE-ME-IN-PRODUCTION"  # noqa: S105
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # ── Encryption (field-level PHI) ─────────────────────
    phi_encryption_key: str = "CHANGE-ME-32-BYTE-KEY-HERE"

    # ── CORS ─────────────────────────────────────────────
    cors_origins: list[str] = [
        "http://localhost:3000",  # Admin panel
        "http://localhost:8081",  # Expo dev
    ]

    # ── Rate Limiting ────────────────────────────────────
    rate_limit_per_minute: int = 60

    # ── AI Service ───────────────────────────────────────
    ai_service_url: str = "http://localhost:8001"

    # ── OTP ──────────────────────────────────────────────
    otp_expire_minutes: int = 5
    otp_max_attempts: int = 3
    otp_rate_limit_window_minutes: int = 10
    otp_max_sends_per_window: int = 3

    # ── Apple Sign In ─────────────────────────────────────
    apple_bundle_id: str = "com.sinalytix.patient"

    # ── Google Sign In ────────────────────────────────────
    google_client_id: str = ""  # Web/server-side client ID for tokeninfo verification

    # ── Consent version ───────────────────────────────────
    tos_version: str = "v1.0"


settings = Settings()
