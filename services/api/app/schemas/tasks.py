"""Task request/response schemas."""

from datetime import datetime

from pydantic import BaseModel, field_validator


class TodayTaskOut(BaseModel):
    occurrence_id: str
    task_id: str
    title: str
    type: str  # one_time | recurring | counter
    subtype: str  # standard | medication
    status: str  # todo | done | skipped
    progress_count: int | None
    target_per_day: int | None
    created_by_actor_type: str  # patient | caregiver | family
    completed_at: datetime | None
    skipped_at: datetime | None


class CreateTaskIn(BaseModel):
    title: str
    type: str  # one_time | recurring | counter
    subtype: str = "standard"
    patient_id: str | None = None  # required when called from family router
    target_per_day: int | None = None  # counter only
    due_date_local: str | None = None  # one_time: YYYY-MM-DD
    frequency: str | None = None  # recurring: daily | weekly
    days_of_week: list[str] | None = None  # weekly: [MON, TUE, ...]

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title cannot be empty")
        return v.strip()

    @field_validator("type")
    @classmethod
    def valid_type(cls, v: str) -> str:
        if v not in ("one_time", "recurring", "counter"):
            raise ValueError("type must be one_time, recurring, or counter")
        return v

    @field_validator("subtype")
    @classmethod
    def valid_subtype(cls, v: str) -> str:
        if v not in ("standard", "medication"):
            raise ValueError("subtype must be standard or medication")
        return v


class OccurrenceOut(BaseModel):
    occurrence_id: str
    status: str
    progress_count: int | None
    completed_at: datetime | None
    skipped_at: datetime | None
