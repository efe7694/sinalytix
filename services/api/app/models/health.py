"""Health profile and medication models.

From Profile & Settings PRD:
- HealthProfile: conditions, allergies, confidence level
- MedicationRecord: free-text, no clinical validation
- HealthProfileAuditLog: IMMUTABLE — tracks every change for PIPEDA compliance
"""

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, Float, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, generate_uuid
from app.models.enums import (
    AllergyFlag,
    DataSource,
    DeclaredConfidence,
    HealthProfileField,
    MedicationStatus,
)


class HealthProfile(Base, TimestampMixin):
    """Patient health profile — conditions and allergies.

    Initially seeded during onboarding, updated via Settings.
    All updates logged in HealthProfileAuditLog.
    """

    __tablename__ = "health_profiles"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False, unique=True)
    conditions: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, default=list, comment="COND_ enum codes from ConditionCode"
    )
    conditions_other_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    allergies: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, default=list, comment="ALG_ enum codes from AllergyCode"
    )
    allergy_flag: Mapped[AllergyFlag] = mapped_column(
        Enum(AllergyFlag, name="allergy_flag"),
        nullable=False,
        default=AllergyFlag.UNKNOWN,
    )
    allergy_notes_text: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Free-text allergy notes"
    )
    declared_confidence: Mapped[DeclaredConfidence] = mapped_column(
        Enum(DeclaredConfidence, name="declared_confidence"),
        nullable=False,
        default=DeclaredConfidence.SELF_DECLARED,
    )
    last_updated_by: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="patient",
        comment="patient | caregiver | family | system | ocr | portal",
    )

    # Relationship
    user = relationship("User", back_populates="health_profile")


class MedicationRecord(Base, TimestampMixin, SoftDeleteMixin):
    """Patient medication record — free text, no clinical validation.

    The system stores what the user enters as-is.
    It does NOT validate dosages or drug interactions.
    This is a record-keeping tool, not a clinical system.
    """

    __tablename__ = "medication_records"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    name: Mapped[str] = mapped_column(
        String(500), nullable=False, comment="Free-text medication name"
    )
    dose: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="Free-text, no validation"
    )
    frequency: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="Free-text")
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[MedicationStatus] = mapped_column(
        Enum(MedicationStatus, name="medication_status"),
        nullable=False,
        default=MedicationStatus.ACTIVE,
    )
    data_source: Mapped[DataSource] = mapped_column(
        Enum(DataSource, name="data_source_medication"),
        nullable=False,
        default=DataSource.MANUAL,
    )
    source_provider: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="Portal name for V2 integrations"
    )
    ocr_confidence: Mapped[float | None] = mapped_column(
        Float, nullable=True, comment="V1+ OCR extraction confidence"
    )
    created_by_actor_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="patient"
    )

    # Relationship
    user = relationship("User", back_populates="medications")


class HealthProfileAuditLog(Base):
    """IMMUTABLE audit log for health profile changes.

    Append-only. No updates, no deletes.
    Tracks previous_value and new_value for every field change.
    Required for PIPEDA/PHIPA compliance.
    """

    __tablename__ = "health_profile_audit_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    field_changed: Mapped[HealthProfileField] = mapped_column(
        Enum(HealthProfileField, name="health_profile_field"), nullable=False
    )
    previous_value: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    new_value: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    changed_by_actor: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="patient | caregiver | family | system | ocr | portal"
    )
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
