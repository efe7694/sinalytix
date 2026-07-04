"""Auth service: OTP, Apple, Google, JWT, refresh, logout, account deletion.

OTP flow:
  send  → Redis key otp:{phone}       = code, TTL = otp_expire_minutes
          Redis key otp_sends:{phone} = count, TTL = otp_rate_limit_window_minutes
  verify → check Redis, compare, create/find user, return JWT pair

Apple flow:
  identity_token (JWT from Apple) → verify with Apple JWKS → find/create user

Google flow:
  id_token → verify via Google tokeninfo API → find/create user

Refresh:
  refresh_token (JWT) → check Redis key refresh:{jti} not revoked → issue new pair

Logout:
  delete Redis key refresh:{jti} to revoke the refresh token
"""

import contextlib
import hashlib
from datetime import UTC, datetime

import httpx
import structlog
from jose import JWTError
from jose import jwt as jose_jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.redis import get_redis
from app.core.security import (
    create_access_token,
    create_refresh_token,
    generate_otp,
    verify_token,
)
from app.models.enums import AuthMethod, UserRole, UserStatus
from app.models.user import OAuthAccount, User
from app.schemas.auth import (
    AuthResponse,
    CompleteOnboardingRequest,
    RefreshResponse,
)

logger = structlog.get_logger()

# Redis key templates
_OTP_KEY = "otp:{phone}"
_OTP_SENDS_KEY = "otp_sends:{phone}"
_OTP_ATTEMPTS_KEY = "otp_attempts:{phone}"
_REFRESH_KEY = "refresh:{jti}"


def _refresh_jti(token: str) -> str:
    """Stable identifier for a refresh token — sha256 of the token string."""
    return hashlib.sha256(token.encode()).hexdigest()[:32]


# ── OTP ──────────────────────────────────────────────────


async def otp_send(phone: str) -> int:
    """Store a new OTP in Redis. Returns remaining TTL in seconds.

    Raises ValueError if the rate limit (3 sends / 10 min) is exceeded.
    """
    redis = await get_redis()
    sends_key = _OTP_SENDS_KEY.format(phone=phone)
    otp_key = _OTP_KEY.format(phone=phone)

    sends = await redis.incr(sends_key)
    if sends == 1:
        await redis.expire(sends_key, settings.otp_rate_limit_window_minutes * 60)

    if sends > settings.otp_max_sends_per_window:
        raise ValueError("rate_limited")

    code = generate_otp()
    ttl = settings.otp_expire_minutes * 60
    await redis.setex(otp_key, ttl, code)
    # Reset attempt counter for this new code
    await redis.delete(_OTP_ATTEMPTS_KEY.format(phone=phone))

    # TODO(before-launch): SMS provider entegrasyonu.
    # Twilio veya AWS SNS kullanılacak. credentials gerekiyor:
    #   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
    # veya AWS_SNS_ARN + boto3. Şimdilik OTP sadece log'a yazılıyor.
    logger.info("otp_generated", phone=phone, code=code)

    return ttl


async def otp_verify(phone: str, code: str, db: AsyncSession) -> AuthResponse:
    """Verify OTP, create/find user, return JWT pair.

    Raises ValueError on bad code, expired, or too many attempts.
    """
    redis = await get_redis()
    otp_key = _OTP_KEY.format(phone=phone)
    attempts_key = _OTP_ATTEMPTS_KEY.format(phone=phone)

    stored = await redis.get(otp_key)
    if not stored:
        raise ValueError("expired")

    attempts = int(await redis.get(attempts_key) or "0")
    if attempts >= settings.otp_max_attempts:
        await redis.delete(otp_key)
        raise ValueError("too_many_attempts")

    if stored != code:
        await redis.incr(attempts_key)
        await redis.expire(attempts_key, settings.otp_expire_minutes * 60)
        raise ValueError("invalid_code")

    # Code matched — consume it
    await redis.delete(otp_key)
    await redis.delete(attempts_key)

    user, is_new = await _get_or_create_phone_user(phone, db)
    return await _issue_tokens(user, is_new, redis)


# ── Apple ─────────────────────────────────────────────────


async def apple_auth(
    identity_token: str,
    given_name: str | None,
    family_name: str | None,
    db: AsyncSession,
) -> AuthResponse:
    """Verify Apple identity token, find/create user, return JWT pair."""
    claims = await _verify_apple_token(identity_token)
    apple_sub = claims["sub"]
    email = claims.get("email")

    display_name: str | None = None
    if given_name or family_name:
        display_name = " ".join(filter(None, [given_name, family_name])) or None

    user, is_new = await _get_or_create_oauth_user(
        provider="apple",
        provider_user_id=apple_sub,
        provider_email=email,
        display_name=display_name,
        auth_method=AuthMethod.APPLE,
        db=db,
    )
    redis = await get_redis()
    return await _issue_tokens(user, is_new, redis)


async def google_auth(id_token: str, db: AsyncSession) -> AuthResponse:
    """Verify Google id_token, find/create user, return JWT pair."""
    claims = await _verify_google_token(id_token)
    google_sub = claims["sub"]
    email = claims.get("email")
    display_name = claims.get("name")

    user, is_new = await _get_or_create_oauth_user(
        provider="google",
        provider_user_id=google_sub,
        provider_email=email,
        display_name=display_name,
        auth_method=AuthMethod.GOOGLE,
        db=db,
    )
    redis = await get_redis()
    return await _issue_tokens(user, is_new, redis)


# ── Refresh ───────────────────────────────────────────────


async def refresh_tokens(refresh_token: str, db: AsyncSession) -> RefreshResponse:
    """Validate refresh token, check revocation, issue new pair."""
    try:
        payload = verify_token(refresh_token)
    except JWTError as exc:
        raise ValueError("invalid_token") from exc

    if payload.get("type") != "refresh":
        raise ValueError("invalid_token")

    user_id: str = payload["sub"]
    redis = await get_redis()

    jti = _refresh_jti(refresh_token)
    revoked = await redis.get(_REFRESH_KEY.format(jti=jti))
    if revoked == "revoked":
        raise ValueError("revoked")

    user = await db.get(User, user_id)
    if not user or user.status == UserStatus.DELETED:
        raise ValueError("user_not_found")

    # Revoke old refresh token
    await redis.setex(
        _REFRESH_KEY.format(jti=jti),
        settings.refresh_token_expire_days * 86400,
        "revoked",
    )

    # Issue new pair
    access = create_access_token(str(user.id), user.role)
    new_refresh, _ = create_refresh_token(str(user.id))
    new_jti = _refresh_jti(new_refresh)
    await redis.setex(
        _REFRESH_KEY.format(jti=new_jti),
        settings.refresh_token_expire_days * 86400,
        "active",
    )

    return RefreshResponse(access_token=access, refresh_token=new_refresh)


# ── Logout ────────────────────────────────────────────────


async def logout(refresh_token: str) -> None:
    """Revoke a refresh token. Best-effort — no error if already revoked."""
    try:
        verify_token(refresh_token)
    except JWTError:
        return

    redis = await get_redis()
    jti = _refresh_jti(refresh_token)
    await redis.setex(
        _REFRESH_KEY.format(jti=jti),
        settings.refresh_token_expire_days * 86400,
        "revoked",
    )


# ── Onboarding completion ─────────────────────────────────


async def complete_onboarding(user: User, req: CompleteOnboardingRequest, db: AsyncSession) -> None:
    """Persist onboarding draft to the database and mark user as onboarded."""
    from app.models.consent import ConsentRecord
    from app.models.emergency_contact import EmergencyContact
    from app.models.enums import AllergyFlag, ECRelationship
    from app.models.health import HealthProfile

    if req.language:
        user.locale = req.language

    if req.consent and req.consent.accept_tos and req.consent.accept_privacy:
        record = ConsentRecord(
            user_id=str(user.id),
            version=settings.tos_version,
            flags={
                "accept_tos": req.consent.accept_tos,
                "accept_privacy": req.consent.accept_privacy,
                "ack_not_emergency": req.consent.ack_not_emergency,
            },
        )
        db.add(record)
        user.consent_version = settings.tos_version
        user.consent_timestamp = datetime.now(UTC)

    if req.emergency_contact:
        ec = req.emergency_contact
        relationship_val = ECRelationship.OTHER
        with contextlib.suppress(ValueError):
            relationship_val = ECRelationship(ec.relationship)
        contact = EmergencyContact(
            user_id=str(user.id),
            name=ec.name,
            relationship=relationship_val,
            phone=ec.phone,
            sort_order=1,
            is_primary=True,
        )
        db.add(contact)

    if req.health_seed:
        hs = req.health_seed
        allergy_flag = AllergyFlag.UNKNOWN
        if hs.allergy_flag:
            with contextlib.suppress(ValueError):
                allergy_flag = AllergyFlag(hs.allergy_flag)
        profile = HealthProfile(
            user_id=str(user.id),
            conditions=hs.conditions,
            allergy_flag=allergy_flag,
            allergy_notes_text=hs.allergy_notes,
        )
        db.add(profile)

    user.onboarding_completed = True
    user.onboarding_completed_at = datetime.now(UTC)
    user.status = UserStatus.ACTIVE

    await db.flush()


# ── Account deletion ──────────────────────────────────────


async def request_account_deletion(user: User, db: AsyncSession) -> datetime:
    """Schedule account deletion (30-day grace period, PIPEDA).

    Returns the scheduled_deletion_at timestamp.
    """
    from datetime import timedelta

    from app.models.account import AccountDeletionRequest
    from app.models.enums import AccountDeletionStatus

    scheduled = datetime.now(UTC) + timedelta(days=30)
    req = AccountDeletionRequest(
        user_id=str(user.id),
        scheduled_deletion_at=scheduled,
        status=AccountDeletionStatus.PENDING,
    )
    db.add(req)
    user.status = UserStatus.DELETED
    await db.flush()
    return scheduled


# ── Internal helpers ──────────────────────────────────────


async def _issue_tokens(user: User, is_new: bool, redis: object) -> AuthResponse:
    access = create_access_token(str(user.id), user.role)
    refresh, _ = create_refresh_token(str(user.id))

    jti = _refresh_jti(refresh)
    await redis.setex(  # type: ignore[attr-defined]
        _REFRESH_KEY.format(jti=jti),
        settings.refresh_token_expire_days * 86400,
        "active",
    )

    return AuthResponse(
        access_token=access,
        refresh_token=refresh,
        user_id=str(user.id),
        is_new_user=is_new,
    )


async def _get_or_create_phone_user(phone: str, db: AsyncSession) -> tuple[User, bool]:
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()

    if user:
        user.last_login_at = datetime.now(UTC)
        return user, False

    user = User(
        phone=phone,
        role=UserRole.PATIENT,
        status=UserStatus.PENDING_VERIFICATION,
        auth_method=AuthMethod.PHONE_OTP,
    )
    db.add(user)
    await db.flush()
    return user, True


async def _get_or_create_oauth_user(
    provider: str,
    provider_user_id: str,
    provider_email: str | None,
    display_name: str | None,
    auth_method: AuthMethod,
    db: AsyncSession,
) -> tuple[User, bool]:
    # Look for existing OAuth link
    result = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.provider == provider,
            OAuthAccount.provider_user_id == provider_user_id,
        )
    )
    oauth = result.scalar_one_or_none()

    if oauth:
        result2 = await db.execute(select(User).where(User.id == oauth.user_id))
        user = result2.scalar_one()
        user.last_login_at = datetime.now(UTC)
        return user, False

    # New user
    user = User(
        email=provider_email,
        display_name=display_name,
        role=UserRole.PATIENT,
        status=UserStatus.PENDING_VERIFICATION,
        auth_method=auth_method,
    )
    db.add(user)
    await db.flush()

    oauth_link = OAuthAccount(
        user_id=str(user.id),
        provider=provider,
        provider_user_id=provider_user_id,
        provider_email=provider_email,
    )
    db.add(oauth_link)
    await db.flush()

    return user, True


async def _verify_apple_token(identity_token: str) -> dict:
    """Verify Apple identity JWT using Apple's public JWKS."""
    header = jose_jwt.get_unverified_header(identity_token)
    kid = header.get("kid")
    alg = header.get("alg", "RS256")

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get("https://appleid.apple.com/auth/keys")
        resp.raise_for_status()
        jwks = resp.json()

    key = next((k for k in jwks["keys"] if k["kid"] == kid), None)
    if not key:
        raise ValueError("Apple public key not found for kid")

    try:
        claims = jose_jwt.decode(
            identity_token,
            key,
            algorithms=[alg],
            audience=settings.apple_bundle_id,
        )
    except JWTError as exc:
        raise ValueError(f"Apple token verification failed: {exc}") from exc

    if claims.get("iss") != "https://appleid.apple.com":
        raise ValueError("Invalid Apple token issuer")

    return claims


async def _verify_google_token(id_token: str) -> dict:
    """Verify Google id_token via tokeninfo endpoint."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
        )

    if resp.status_code != 200:
        raise ValueError("Invalid Google token")

    data = resp.json()
    if "error" in data:
        raise ValueError(f"Google token error: {data['error']}")

    # Verify audience matches our client ID (skip check if not configured)
    if settings.google_client_id and data.get("aud") != settings.google_client_id:
        raise ValueError("Google token audience mismatch")

    return data
