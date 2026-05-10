"""Auth request/response schemas."""

from pydantic import BaseModel, field_validator


# ── OTP ──────────────────────────────────────────────────


class OtpSendRequest(BaseModel):
    phone: str  # E.164 format, e.g. +14165550100

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        import re

        if not re.match(r"^\+1\d{10}$", v):
            raise ValueError("Phone must be a valid Canadian/US E.164 number (+1XXXXXXXXXX)")
        return v


class OtpSendResponse(BaseModel):
    ok: bool
    expires_in_seconds: int


class OtpVerifyRequest(BaseModel):
    phone: str
    code: str

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be 6 digits")
        return v


# ── Apple ─────────────────────────────────────────────────


class AppleAuthRequest(BaseModel):
    identity_token: str
    given_name: str | None = None
    family_name: str | None = None


# ── Google ────────────────────────────────────────────────


class GoogleAuthRequest(BaseModel):
    id_token: str


# ── Shared response ───────────────────────────────────────


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    is_new_user: bool


# ── Refresh ───────────────────────────────────────────────


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# ── Logout ────────────────────────────────────────────────


class LogoutRequest(BaseModel):
    refresh_token: str


# ── Onboarding completion ─────────────────────────────────


class ConsentDraft(BaseModel):
    accept_tos: bool
    accept_privacy: bool
    ack_not_emergency: bool
    consented_at: str | None = None


class EmergencyContactDraft(BaseModel):
    name: str
    relationship: str
    phone: str


class HealthSeedDraft(BaseModel):
    conditions: list[str] = []
    allergy_flag: str | None = None
    allergy_notes: str | None = None


class CompleteOnboardingRequest(BaseModel):
    language: str | None = None
    consent: ConsentDraft | None = None
    emergency_contact: EmergencyContactDraft | None = None
    health_seed: HealthSeedDraft | None = None


class CompleteOnboardingResponse(BaseModel):
    ok: bool
