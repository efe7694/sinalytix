"""Notification request/response schemas."""

from datetime import datetime

from pydantic import BaseModel


class NotificationOut(BaseModel):
    notification_id: str
    type: str
    title: str
    redirect_target: str
    redirect_params: dict | None
    is_read: bool
    read_at: datetime | None
    created_at: datetime
    expires_at_ui: datetime


class RegisterPushTokenIn(BaseModel):
    token: str
    platform: str  # ios | android
