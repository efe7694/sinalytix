"""JWT and OTP utilities.

Access tokens: 15 min, signed HS256 JWT.
Refresh tokens: 7 days, signed HS256 JWT — stored in Redis for revocation.
OTP: 6-digit numeric, generated with secrets module.
"""

import secrets
import string
from datetime import UTC, datetime, timedelta
from typing import Any

from jose import jwt

from app.core.config import settings

_OTP_CHARS = string.digits


def create_access_token(user_id: str, role: str) -> str:
    exp = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {"sub": user_id, "role": role, "type": "access", "exp": exp},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def create_refresh_token(user_id: str) -> tuple[str, datetime]:
    exp = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    token = jwt.encode(
        {"sub": user_id, "type": "refresh", "exp": exp},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )
    return token, exp


def verify_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT. Raises JWTError on invalid/expired tokens."""
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])


def generate_otp() -> str:
    return "".join(secrets.choice(_OTP_CHARS) for _ in range(6))
