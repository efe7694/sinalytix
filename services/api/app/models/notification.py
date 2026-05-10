"""Notification models — from Bildirim Merkezi PRD.

Notifications are redirect links only — content is not shown in the panel.
UI retention: 30 days. DB retention: 1 year for PIPEDA audit.
Panel open → all visible notifications marked as read (bulk).
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, generate_uuid
from app.models.enums import NotificationRedirectTarget, NotificationType


class Notification(Base):
    """In-app notification — redirect link to relevant screen.

    Created by triggering services (task scheduler, messaging, etc.).
    Push notification is sent separately via OS channel.
    """

    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False, comment="Localized short title")
    redirect_target: Mapped[NotificationRedirectTarget] = mapped_column(
        Enum(NotificationRedirectTarget, name="notification_redirect_target"),
        nullable=False,
    )
    redirect_params: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True, comment="Optional deep link params, e.g. conversation_id"
    )
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    push_sent: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, comment="Whether OS push notification was sent"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expires_at_ui: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="created_at + 30 days — hidden from UI after this",
    )
    expires_at_db: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="created_at + 1 year — physically deleted from DB",
    )

    # Relationship
    user = relationship("User", back_populates="notifications")


class PushToken(Base):
    """Device push token for sending OS notifications.

    One row per (user, token) pair. Tokens are upserted on app start.
    Stale tokens are cleaned up when APNs/FCM returns an invalid-token error.
    """

    __tablename__ = "push_tokens"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    token: Mapped[str] = mapped_column(String(500), nullable=False, unique=True)
    platform: Mapped[str] = mapped_column(String(10), nullable=False, comment="ios | android")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
