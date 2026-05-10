"""Messaging models — from Mesajlasma / Inbox PRD.

Individual + group ("Bakim Ekibim") conversations.
Agent-sourced messages tagged with source=agent.
2-year message retention. Encrypted at rest.
"""

from datetime import datetime

from sqlalchemy import DateTime, Enum, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, generate_uuid
from app.models.enums import ActorType, ConversationType, MessageSource


class Conversation(Base, TimestampMixin):
    """Conversation thread — individual or group.

    "Bakim Ekibim" group is auto-created by system.
    Members auto-added/removed when links are created/broken.
    """

    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    type: Mapped[ConversationType] = mapped_column(
        Enum(ConversationType, name="conversation_type"), nullable=False
    )
    name: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment='Group: "Bakim Ekibim"; Individual: null'
    )
    archived_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, comment="Set when connection is broken"
    )
    last_message_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, comment="For sorting conversations"
    )


class ConversationMember(Base, TimestampMixin):
    """Member of a conversation."""

    __tablename__ = "conversation_members"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    conversation_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    actor_type: Mapped[ActorType] = mapped_column(
        Enum(ActorType, name="conv_member_actor_type"), nullable=False
    )
    actor_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    left_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, comment="Set when connection is broken"
    )


class Message(Base):
    """Individual message within a conversation.

    Content is encrypted at rest (AES-256).
    Agent-sourced messages have source=agent and display "Sina ile gonderildi".
    Retention: 2 years from sent_at.
    """

    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    conversation_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    sender_actor_type: Mapped[ActorType] = mapped_column(
        Enum(ActorType, name="msg_sender_actor_type"), nullable=False
    )
    sender_actor_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    content: Mapped[str] = mapped_column(
        Text, nullable=False, comment="Encrypted PHI — message text"
    )
    source: Mapped[MessageSource] = mapped_column(
        Enum(MessageSource, name="message_source"),
        nullable=False,
        default=MessageSource.MANUAL,
    )
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, comment="sent_at + 2 years"
    )


class MessageReadStatus(Base):
    """Tracks who has read a message and when."""

    __tablename__ = "message_read_statuses"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    message_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    reader_actor_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    read_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
