"""Pydantic schemas for caregiver-specific endpoints."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import (
    AuthMethod,
    CaregiverNotificationType,
    CaregiverProfileStatus,
    CaregiverRole,
    CheckOutReason,
)

# ── Onboarding ───────────────────────────────────────────


class CaregiverOnboardingCompleteRequest(BaseModel):
    """Payload sent after successful auth to transfer local draft to backend."""

    language: str = Field(..., max_length=10, description="BCP-47 locale e.g. en, fr, tr")
    consent: dict = Field(
        ...,
        description=(
            "{"
            "accept_tos: bool, accept_privacy: bool, "
            "ack_not_emergency: bool, ack_no_clinical_decision: bool, "
            "consented_at: ISO8601"
            "}"
        ),
    )
    first_name: str = Field(..., min_length=2, max_length=50)
    last_name: str = Field(..., min_length=2, max_length=50)
    auth_method: AuthMethod
    phone: str | None = Field(None, max_length=20, description="E.164; OTP path only")
    email: str | None = Field(None, max_length=255, description="From SSO if available")
    tos_version: str = Field(default="1.0.0", max_length=20)


class CaregiverProfileResponse(BaseModel):
    user_id: str
    first_name: str
    last_name: str
    phone: str | None
    email: str | None
    role: CaregiverRole | None
    status: CaregiverProfileStatus
    onboarding_completed_at: datetime | None

    class Config:
        from_attributes = True


# ── Linked Patients ──────────────────────────────────────


class LinkedPatientSummary(BaseModel):
    """Minimal patient info for caregiver home screen patient selector."""

    patient_id: str
    first_name: str
    last_name: str
    primary_condition: str | None = None
    link_id: str
    linked_at: datetime


# ── Shifts ───────────────────────────────────────────────


class ShiftCheckInRequest(BaseModel):
    patient_id: str
    timezone_iana: str = Field(
        default="America/Toronto", description="IANA timezone of caregiver device"
    )


class ShiftCheckOutRequest(BaseModel):
    shift_note: str | None = Field(None, max_length=500)


class ShiftResponse(BaseModel):
    shift_id: str
    caregiver_id: str
    patient_id: str
    shift_active: bool
    checked_in_at: datetime | None
    checked_out_at: datetime | None
    check_out_reason: CheckOutReason | None
    shift_note: str | None
    duration_minutes: int | None
    timezone_iana: str | None
    alert_24h_sent: bool

    class Config:
        from_attributes = True


class ActiveShiftResponse(BaseModel):
    """Current active shift state — returned on home screen load."""

    has_active_shift: bool
    active_shift: ShiftResponse | None = None


class ShiftHistoryItem(BaseModel):
    shift_id: str
    patient_id: str
    patient_name: str
    checked_in_at: datetime
    checked_out_at: datetime | None
    duration_minutes: int | None
    shift_note: str | None

    class Config:
        from_attributes = True


# ── Caregiver Notifications ──────────────────────────────


class CaregiverNotificationResponse(BaseModel):
    notification_id: str
    notification_type: CaregiverNotificationType
    title: str
    body: str
    read: bool
    created_at: datetime
    action_url: str | None = None

    class Config:
        from_attributes = True
