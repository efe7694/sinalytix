"""Call attempt log — from Hizli Cagri PRD.

IMMUTABLE audit log for every call attempt (SOS or regular).
All calls go through native dialer (tel: deep link) in V0.
"""

from datetime import datetime

from sqlalchemy import DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, generate_uuid
from app.models.enums import CallCancelStage, CallStatus, CallTargetType, CallType


class CallAttemptLog(Base):
    """IMMUTABLE call attempt log.

    Records every SOS and regular call attempt.
    Append-only — no updates, no deletes.
    """

    __tablename__ = "call_attempt_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    call_type: Mapped[CallType] = mapped_column(Enum(CallType, name="call_type"), nullable=False)
    target_type: Mapped[CallTargetType] = mapped_column(
        Enum(CallTargetType, name="call_target_type"), nullable=False
    )
    target_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, comment="null for emergency_services (911)"
    )
    status: Mapped[CallStatus] = mapped_column(Enum(CallStatus, name="call_status"), nullable=False)
    cancel_stage: Mapped[CallCancelStage | None] = mapped_column(
        Enum(CallCancelStage, name="call_cancel_stage"), nullable=True
    )
    initiated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
