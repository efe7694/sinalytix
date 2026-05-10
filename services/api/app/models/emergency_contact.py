"""Emergency contact management.

Max 3 contacts per patient. sort_order determines SOS call priority.
Verification is separate from onboarding — SOS works even without verification.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.orm import relationship as sa_relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, generate_uuid
from app.models.enums import ECInviteStatus, ECRelationship


class EmergencyContact(Base, TimestampMixin, SoftDeleteMixin):
    """Emergency contact for a patient.

    - Max 3 per patient
    - sort_order determines SOS call priority
    - SOS works regardless of verification status
    - Invite flow: add → SMS/email sent → accept → app_user or phone_only
    """

    __tablename__ = "emergency_contacts"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), nullable=False, comment="Patient user_id"
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, comment="Encrypted PHI")
    relationship: Mapped[ECRelationship] = mapped_column(
        Enum(ECRelationship, name="ec_relationship"), nullable=False
    )
    phone: Mapped[str] = mapped_column(
        String(50), nullable=False, comment="Encrypted PHI, E.164 format"
    )
    phone_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    phone_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, comment="SOS call priority: 1=first, 2=second, 3=third"
    )
    invite_status: Mapped[ECInviteStatus] = mapped_column(
        Enum(ECInviteStatus, name="ec_invite_status"),
        nullable=False,
        default=ECInviteStatus.PENDING,
    )
    invite_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    invite_accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    linked_family_user_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, comment="If this EC also has a Family App account"
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # ORM Relationship
    user = sa_relationship("User", back_populates="emergency_contacts")
