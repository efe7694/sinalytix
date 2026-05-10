"""User & authentication models.

Shared across all 4 apps + admin panel.
Single users table with role-based differentiation.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, generate_uuid
from app.models.enums import AuthMethod, UserRole, UserStatus


class User(Base, TimestampMixin, SoftDeleteMixin):
    """All platform users — unified auth across 4 apps + admin."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    email: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True, comment="Encrypted PHI"
    )
    phone: Mapped[str | None] = mapped_column(
        String(50), unique=True, nullable=True, comment="Encrypted PHI, E.164 format"
    )
    display_name: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="Encrypted PHI"
    )
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), nullable=False)
    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus, name="user_status"),
        nullable=False,
        default=UserStatus.PENDING_VERIFICATION,
    )
    auth_method: Mapped[AuthMethod | None] = mapped_column(
        Enum(AuthMethod, name="auth_method"), nullable=True
    )
    locale: Mapped[str] = mapped_column(
        String(10), nullable=False, default="en", comment="en, fr, tr"
    )
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True, comment="Argon2id hash")
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    consent_version: Mapped[str | None] = mapped_column(
        String(20), nullable=True, comment="Latest accepted ToS/Privacy version"
    )
    consent_timestamp: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    patient_profile = relationship("PatientProfile", back_populates="user", uselist=False)
    consent_records = relationship("ConsentRecord", back_populates="user")
    emergency_contacts = relationship("EmergencyContact", back_populates="user")
    health_profile = relationship("HealthProfile", back_populates="user", uselist=False)
    medications = relationship("MedicationRecord", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    oauth_accounts = relationship("OAuthAccount", back_populates="user")


class OAuthAccount(Base, TimestampMixin):
    """Social auth provider links.

    One row per (user, provider) pair. Allows a user to link both Apple and Google.
    Apple sub is opaque; Google sub is the numeric account ID.

    TODO(before-launch): Migration henüz çalıştırılmadı. oauth_accounts tablosu DB'de yok.
      cd services/api
      alembic revision --autogenerate -m "add_oauth_accounts"
      alembic upgrade head
    """

    __tablename__ = "oauth_accounts"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider: Mapped[str] = mapped_column(String(20), nullable=False)  # "apple" | "google"
    provider_user_id: Mapped[str] = mapped_column(String(255), nullable=False)
    provider_email: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="Encrypted PHI"
    )

    user = relationship("User", back_populates="oauth_accounts")


class PatientProfile(Base, TimestampMixin):
    """Extended patient profile — linked to a user with role=patient."""

    __tablename__ = "patient_profiles"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False, unique=True)
    date_of_birth: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="Encrypted PHI"
    )
    mobility_level: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="independent | assisted | bedridden"
    )
    tech_literacy: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="low | medium | high"
    )
    timezone: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="America/Toronto",
        comment="Patient timezone for all notifications and scheduling",
    )
    wearable_device_ids: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationship
    user = relationship("User", back_populates="patient_profile")
