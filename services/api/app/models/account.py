"""Account management models.

Account deletion with 30-day grace period (PIPEDA compliance).
Data export for user data portability.
"""

from datetime import datetime

from sqlalchemy import DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, generate_uuid
from app.models.enums import AccountDeletionStatus


class AccountDeletionRequest(Base):
    """Account deletion request with 30-day grace period.

    PIPEDA Organization Accountability principle requires
    a reasonable grace period before permanent deletion.
    User can cancel by logging in during the grace period.
    """

    __tablename__ = "account_deletion_requests"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    scheduled_deletion_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, comment="requested_at + 30 days"
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    executed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[AccountDeletionStatus] = mapped_column(
        Enum(AccountDeletionStatus, name="account_deletion_status"),
        nullable=False,
        default=AccountDeletionStatus.PENDING,
    )
