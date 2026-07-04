"""Auth endpoints.

POST /api/v1/auth/otp/send           — send OTP to phone
POST /api/v1/auth/otp/verify         — verify OTP, return JWT pair
POST /api/v1/auth/apple              — Apple Sign In
POST /api/v1/auth/google             — Google Sign In
POST /api/v1/auth/refresh            — refresh JWT pair
POST /api/v1/auth/logout             — revoke refresh token
POST /api/v1/auth/complete-onboarding — persist onboarding draft (authenticated)
DELETE /api/v1/auth/account          — schedule account deletion (authenticated)
"""

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.schemas.auth import (
    AppleAuthRequest,
    AuthResponse,
    CompleteOnboardingRequest,
    CompleteOnboardingResponse,
    GoogleAuthRequest,
    LogoutRequest,
    OtpSendRequest,
    OtpSendResponse,
    OtpVerifyRequest,
    RefreshRequest,
    RefreshResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
logger = structlog.get_logger()


# ── OTP ──────────────────────────────────────────────────


@router.post("/otp/send", response_model=OtpSendResponse)
async def otp_send(req: OtpSendRequest) -> OtpSendResponse:
    try:
        ttl = await auth_service.otp_send(req.phone)
    except ValueError as exc:
        if str(exc) == "rate_limited":
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "OTP rate limit exceeded. Try again later.",
            ) from exc
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    return OtpSendResponse(ok=True, expires_in_seconds=ttl)


@router.post("/otp/verify", response_model=AuthResponse)
async def otp_verify(req: OtpVerifyRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    try:
        return await auth_service.otp_verify(req.phone, req.code, db)
    except ValueError as exc:
        msg = str(exc)
        if msg == "expired":
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "OTP expired. Request a new code."
            ) from exc
        if msg == "too_many_attempts":
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts.") from exc
        if msg == "invalid_code":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid OTP code.") from exc
        raise HTTPException(status.HTTP_400_BAD_REQUEST, msg) from exc


# ── Apple ─────────────────────────────────────────────────


@router.post("/apple", response_model=AuthResponse)
async def apple_auth(req: AppleAuthRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    try:
        return await auth_service.apple_auth(
            req.identity_token, req.given_name, req.family_name, db
        )
    except ValueError as exc:
        logger.warning("apple_auth_failed", error=str(exc))
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Apple authentication failed.") from exc


# ── Google ────────────────────────────────────────────────


@router.post("/google", response_model=AuthResponse)
async def google_auth(req: GoogleAuthRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    try:
        return await auth_service.google_auth(req.id_token, db)
    except ValueError as exc:
        logger.warning("google_auth_failed", error=str(exc))
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google authentication failed.") from exc


# ── Refresh ───────────────────────────────────────────────


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(req: RefreshRequest, db: AsyncSession = Depends(get_db)) -> RefreshResponse:
    try:
        return await auth_service.refresh_tokens(req.refresh_token, db)
    except ValueError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc


# ── Logout ────────────────────────────────────────────────


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(req: LogoutRequest) -> None:
    await auth_service.logout(req.refresh_token)


# ── Onboarding completion ─────────────────────────────────


@router.post("/complete-onboarding", response_model=CompleteOnboardingResponse)
async def complete_onboarding(
    req: CompleteOnboardingRequest,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> CompleteOnboardingResponse:
    await auth_service.complete_onboarding(user, req, db)
    return CompleteOnboardingResponse(ok=True)


# ── Account deletion ──────────────────────────────────────


@router.delete("/account", status_code=status.HTTP_200_OK)
async def delete_account(
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    scheduled_at = await auth_service.request_account_deletion(user, db)
    return {"scheduled_deletion_at": scheduled_at.isoformat()}
