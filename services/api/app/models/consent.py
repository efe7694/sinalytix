"""Consent records — PIPEDA/PHIPA compliance.

IMMUTABLE TABLE: No updates, no deletes.
New consent = new row. Audit trail is preserved forever.
"""

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, generate_uuid


class ConsentRecord(Base):
    """Immutable consent record for PIPEDA audit compliance.

    Every time a user accepts ToS/Privacy, a new record is created.
    This table is append-only — never update, never delete.
    """

    __tablename__ = "consent_records"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    version: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="ToS/Privacy version e.g. v1.0"
    )
    flags: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        comment='{"accept_tos": true, "accept_privacy": true, "ack_not_emergency": true}',
    )
    consented_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    ip_address: Mapped[str | None] = mapped_column(
        String(45), nullable=True, comment="IPv4 or IPv6"
    )

    # Relationship
    user = relationship("User", back_populates="consent_records")
