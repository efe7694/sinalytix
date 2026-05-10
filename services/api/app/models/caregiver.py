"""Caregiver link, profile, and shift models.

CaregiverLink: QR/code-based pairing (15-min expiry).
CaregiverProfile: Professional profile created after onboarding.
CaregiverShift: Active shift tracking with check-in/out, notes, EVV prep.
FamilyAvailability: DND flag read by Patient App for standard calls.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, generate_uuid
from app.models.enums import (
    CaregiverLinkStatus,
    CaregiverProfileStatus,
    CaregiverRole,
    CheckOutReason,
)


class CaregiverLink(Base, TimestampMixin):
    """QR/code-based caregiver-patient pairing.

    - Patient generates code/QR in Settings > Privacy & Security
    - Caregiver enters code in their app
    - Code expires in 15 minutes
    """

    __tablename__ = "caregiver_links"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    caregiver_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, comment="Populated when link is established"
    )
    link_code: Mapped[str] = mapped_column(
        String(10), nullable=False, unique=True, comment="6-char alphanumeric code"
    )
    qr_payload: Mapped[str] = mapped_column(
        String(500), nullable=False, comment="Deep link URL for QR code"
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, comment="created_at + 15 minutes"
    )
    status: Mapped[CaregiverLinkStatus] = mapped_column(
        Enum(CaregiverLinkStatus, name="caregiver_link_status"),
        nullable=False,
        default=CaregiverLinkStatus.PENDING,
    )
    linked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    unlinked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    unlinked_by: Mapped[str | None] = mapped_column(
        String(20), nullable=True, comment="patient | caregiver | system"
    )


class CaregiverProfile(Base, TimestampMixin):
    """Professional profile for caregiver users.

    Created during onboarding after successful auth.
    Role and agency fields are populated in V1+.
    """

    __tablename__ = "caregiver_profiles"

    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), primary_key=True, comment="Same as users.id"
    )
    first_name: Mapped[str] = mapped_column(String(50), nullable=False)
    last_name: Mapped[str] = mapped_column(String(50), nullable=False)
    phone: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="E.164; from OTP auth or V1 profile completion"
    )
    email: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="From SSO or V1 profile completion"
    )
    role: Mapped[CaregiverRole | None] = mapped_column(
        Enum(CaregiverRole, name="caregiver_role"),
        nullable=True,
        comment="V1: psw | rpn | rn | hca | other",
    )
    agency_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, comment="V1: populated after agency connection"
    )
    status: Mapped[CaregiverProfileStatus] = mapped_column(
        Enum(CaregiverProfileStatus, name="caregiver_profile_status"),
        nullable=False,
        default=CaregiverProfileStatus.ACTIVE,
    )
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class CaregiverShift(Base, TimestampMixin):
    """Active caregiver shift — determines availability for standard calls.

    Patient App reads shift_active to enable/disable caregiver call button.
    Partial unique index enforces at most one active shift per caregiver at DB level.
    """

    __tablename__ = "caregiver_shifts"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    caregiver_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    patient_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    shift_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    caregiver_phone: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="Encrypted PHI"
    )
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    checked_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # V0 additions
    check_out_reason: Mapped[CheckOutReason | None] = mapped_column(
        Enum(CheckOutReason, name="check_out_reason"),
        nullable=True,
        comment="manual | auto_switch | system_timeout",
    )
    shift_note: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Free-text checkout note, max 500 chars"
    )
    shift_note_structured: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True, comment="V1: SBAR-inspired structured note"
    )
    duration_minutes: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="Set on checkout: (checked_out_at - checked_in_at) / 60"
    )
    timezone_iana: Mapped[str | None] = mapped_column(
        String(60), nullable=True, comment="Caregiver device timezone e.g. America/Toronto"
    )
    alert_24h_sent: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, comment="Whether 24h overrun alert was dispatched"
    )


class FamilyAvailability(Base, TimestampMixin):
    """Family member DND status — read by Patient App for standard calls.

    dnd=true → family call button is disabled in Patient App.
    """

    __tablename__ = "family_availability"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    family_member_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    patient_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    dnd: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, comment="Do Not Disturb — set from Family App"
    )
    family_phone: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="Encrypted PHI"
    )
