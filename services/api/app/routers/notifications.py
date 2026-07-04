"""Notification endpoints.

GET  /api/v1/notifications            — list all notifications
POST /api/v1/notifications/read-all   — bulk mark as read
POST /api/v1/notifications/push-token — register device push token
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.schemas.notifications import NotificationOut, RegisterPushTokenIn
from app.services import notifications_service

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    user: CurrentUser, db: AsyncSession = Depends(get_db)
) -> list[NotificationOut]:
    return await notifications_service.list_notifications(user, db)


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(user: CurrentUser, db: AsyncSession = Depends(get_db)) -> None:
    await notifications_service.mark_all_read(user, db)


@router.post("/push-token", status_code=status.HTTP_204_NO_CONTENT)
async def register_push_token(
    data: RegisterPushTokenIn,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    await notifications_service.register_push_token(user, data, db)
