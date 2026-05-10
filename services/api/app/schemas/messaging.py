"""Messaging request/response schemas."""

from datetime import datetime

from pydantic import BaseModel, computed_field, field_validator


class ConversationOut(BaseModel):
    conversation_id: str
    patient_id: str
    type: str  # individual | group
    name: str | None
    archived_at: datetime | None
    last_message_at: datetime | None
    last_message_preview: str | None
    unread_count: int

    @computed_field  # type: ignore[prop-decorator]
    @property
    def is_archived(self) -> bool:
        return self.archived_at is not None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def is_group(self) -> bool:
        return self.type == "group"


class MessageOut(BaseModel):
    message_id: str
    conversation_id: str
    sender_actor_type: str
    sender_actor_id: str
    sender_name: str
    content: str
    source: str  # manual | agent
    sent_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def is_ai_generated(self) -> bool:
        return self.source == "agent"


class SendMessageIn(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Message content cannot be empty")
        return v.strip()
