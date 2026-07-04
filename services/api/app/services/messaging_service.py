"""Messaging service — conversations and messages."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ActorType, MessageSource
from app.models.messaging import Conversation, Message, MessageReadStatus
from app.models.user import User
from app.schemas.messaging import ConversationOut, MessageOut, SendMessageIn


async def list_conversations(patient: User, db: AsyncSession) -> list[ConversationOut]:
    """Return all non-archived conversations for the patient."""
    result = await db.execute(
        select(Conversation)
        .where(
            Conversation.patient_id == str(patient.id),
            Conversation.archived_at.is_(None),
        )
        .order_by(Conversation.last_message_at.desc().nullslast())
    )
    conversations = result.scalars().all()

    out = []
    for conv in conversations:
        unread_count = await _unread_count(conv, patient, db)
        last_preview = await _last_message_preview(conv, db)
        out.append(
            ConversationOut(
                conversation_id=str(conv.id),
                patient_id=str(conv.patient_id),
                type=conv.type.value,
                name=conv.name,
                archived_at=conv.archived_at,
                last_message_at=conv.last_message_at,
                last_message_preview=last_preview,
                unread_count=unread_count,
            )
        )

    return out


async def list_messages(patient: User, conversation_id: str, db: AsyncSession) -> list[MessageOut]:
    """Return messages for a conversation the patient belongs to."""
    conv = await db.get(Conversation, conversation_id)
    if not conv or conv.patient_id != str(patient.id):
        raise ValueError("not_found")

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.sent_at.asc())
    )
    messages = result.scalars().all()

    return [
        MessageOut(
            message_id=str(msg.id),
            conversation_id=str(msg.conversation_id),
            sender_actor_type=msg.sender_actor_type.value,
            sender_actor_id=str(msg.sender_actor_id),
            sender_name=await _resolve_sender_name(msg, patient, db),
            content=msg.content,
            source=msg.source.value,
            sent_at=msg.sent_at,
        )
        for msg in messages
    ]


async def send_message(
    patient: User, conversation_id: str, data: SendMessageIn, db: AsyncSession
) -> MessageOut:
    """Send a message from the patient in a conversation."""
    conv = await db.get(Conversation, conversation_id)
    if not conv or conv.patient_id != str(patient.id):
        raise ValueError("not_found")
    if conv.archived_at:
        raise ValueError("conversation_archived")

    now = datetime.now(UTC)
    expires = now + timedelta(days=365 * 2)

    msg = Message(
        conversation_id=conversation_id,
        sender_actor_type=ActorType.PATIENT,
        sender_actor_id=str(patient.id),
        content=data.content,
        source=MessageSource.MANUAL,
        sent_at=now,
        expires_at=expires,
    )
    db.add(msg)

    conv.last_message_at = now
    await db.flush()
    await db.refresh(msg)

    return MessageOut(
        message_id=str(msg.id),
        conversation_id=str(msg.conversation_id),
        sender_actor_type=msg.sender_actor_type.value,
        sender_actor_id=str(msg.sender_actor_id),
        sender_name="Siz",
        content=msg.content,
        source=msg.source.value,
        sent_at=msg.sent_at,
    )


async def mark_conversation_read(patient: User, conversation_id: str, db: AsyncSession) -> None:
    """Mark all messages in a conversation as read by the patient."""
    conv = await db.get(Conversation, conversation_id)
    if not conv or conv.patient_id != str(patient.id):
        raise ValueError("not_found")

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .where(Message.sender_actor_id != str(patient.id))
    )
    messages = result.scalars().all()

    now = datetime.now(UTC)
    for msg in messages:
        existing = await db.execute(
            select(MessageReadStatus).where(
                MessageReadStatus.message_id == str(msg.id),
                MessageReadStatus.reader_actor_id == str(patient.id),
            )
        )
        if not existing.scalar_one_or_none():
            db.add(
                MessageReadStatus(
                    message_id=str(msg.id),
                    reader_actor_id=str(patient.id),
                    read_at=now,
                )
            )


async def _unread_count(conv: Conversation, patient: User, db: AsyncSession) -> int:
    msg_result = await db.execute(
        select(Message).where(
            Message.conversation_id == str(conv.id),
            Message.sender_actor_id != str(patient.id),
        )
    )
    messages = msg_result.scalars().all()
    if not messages:
        return 0

    unread = 0
    for msg in messages:
        read_result = await db.execute(
            select(MessageReadStatus).where(
                MessageReadStatus.message_id == str(msg.id),
                MessageReadStatus.reader_actor_id == str(patient.id),
            )
        )
        if not read_result.scalar_one_or_none():
            unread += 1
    return unread


async def _last_message_preview(conv: Conversation, db: AsyncSession) -> str | None:
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == str(conv.id))
        .order_by(Message.sent_at.desc())
        .limit(1)
    )
    msg = result.scalar_one_or_none()
    if not msg:
        return None
    return msg.content[:80] if len(msg.content) > 80 else msg.content


async def _resolve_sender_name(msg: Message, patient: User, db: AsyncSession) -> str:
    if str(msg.sender_actor_id) == str(patient.id):
        return "Siz"
    sender = await db.get(User, str(msg.sender_actor_id))
    if sender and sender.display_name:
        return sender.display_name
    return msg.sender_actor_type.value.capitalize()
