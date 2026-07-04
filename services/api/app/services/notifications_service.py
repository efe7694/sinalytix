"""Notifications service — list, read, push token registration."""

from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, PushToken
from app.models.user import User
from app.schemas.notifications import NotificationOut, RegisterPushTokenIn


async def list_notifications(patient: User, db: AsyncSession) -> list[NotificationOut]:
    """Return all notifications for the patient (including expired — UI filters 30d)."""
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == str(patient.id))
        .order_by(Notification.created_at.desc())
        .limit(200)
    )
    notifications = result.scalars().all()

    return [
        NotificationOut(
            notification_id=str(n.id),
            type=n.type.value,
            title=n.title,
            redirect_target=n.redirect_target.value,
            redirect_params=n.redirect_params,
            is_read=n.is_read,
            read_at=n.read_at,
            created_at=n.created_at,
            expires_at_ui=n.expires_at_ui,
        )
        for n in notifications
    ]


async def mark_all_read(patient: User, db: AsyncSession) -> None:
    """Bulk mark all unread notifications as read."""
    now = datetime.now(UTC)
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == str(patient.id),
            Notification.is_read.is_(False),
        )
        .values(is_read=True, read_at=now)
    )


async def register_push_token(patient: User, data: RegisterPushTokenIn, db: AsyncSession) -> None:
    """Upsert device push token for the patient."""
    result = await db.execute(
        select(PushToken).where(
            PushToken.user_id == str(patient.id),
            PushToken.token == data.token,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.platform = data.platform
        existing.updated_at = datetime.now(UTC)
    else:
        db.add(
            PushToken(
                user_id=str(patient.id),
                token=data.token,
                platform=data.platform,
            )
        )
