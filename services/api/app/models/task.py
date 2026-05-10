"""Task management models — from Gorev Takip PRD.

Three task types: one_time, recurring, counter.
Two subtypes: standard, medication.
Shared across Patient, Family, and Caregiver apps.
"""

from datetime import date, datetime, time

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    Integer,
    String,
    Time,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, generate_uuid
from app.models.enums import (
    ActivityAction,
    ActorType,
    RecurrenceFrequency,
    SkipReason,
    SourceProvenance,
    TaskDefinitionStatus,
    TaskOccurrenceStatus,
    TaskSubtype,
    TaskType,
)


class TaskDefinition(Base, TimestampMixin):
    """Task template — defines what the task is and how it recurs.

    Created by patient, caregiver, or family.
    created_by_actor_type is shown as a label on the task row.
    """

    __tablename__ = "task_definitions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    type: Mapped[TaskType] = mapped_column(Enum(TaskType, name="task_type"), nullable=False)
    subtype: Mapped[TaskSubtype] = mapped_column(
        Enum(TaskSubtype, name="task_subtype"),
        nullable=False,
        default=TaskSubtype.STANDARD,
    )
    status: Mapped[TaskDefinitionStatus] = mapped_column(
        Enum(TaskDefinitionStatus, name="task_definition_status"),
        nullable=False,
        default=TaskDefinitionStatus.ACTIVE,
    )
    created_by_actor_type: Mapped[ActorType] = mapped_column(
        Enum(ActorType, name="task_actor_type"), nullable=False
    )
    created_by_actor_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    source_provenance: Mapped[SourceProvenance] = mapped_column(
        Enum(SourceProvenance, name="source_provenance"),
        nullable=False,
        default=SourceProvenance.MANUAL,
    )


class TaskSchedule(Base, TimestampMixin):
    """Schedule configuration for a task definition.

    One-time: due_date_local + optional due_time_local
    Recurring: frequency + days_of_week + optional time_of_day_local
    Counter: target_per_day
    """

    __tablename__ = "task_schedules"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    task_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False, unique=True)

    # One-time fields
    due_date_local: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_time_local: Mapped[time | None] = mapped_column(Time, nullable=True)

    # Recurring fields
    frequency: Mapped[RecurrenceFrequency | None] = mapped_column(
        Enum(RecurrenceFrequency, name="recurrence_frequency"), nullable=True
    )
    days_of_week: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True, comment="For weekly: [MON, WED, FRI]"
    )
    time_of_day_local: Mapped[time | None] = mapped_column(Time, nullable=True)

    # Counter fields
    target_per_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reset_rule: Mapped[str | None] = mapped_column(String(20), nullable=True, default="daily")


class TaskOccurrence(Base, TimestampMixin):
    """A single instance of a task on a specific day.

    Generated from TaskDefinition + TaskSchedule.
    Status transitions: todo → done | skipped. No auto-skip at end of day.
    """

    __tablename__ = "task_occurrences"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    task_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    date_local: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[TaskOccurrenceStatus] = mapped_column(
        Enum(TaskOccurrenceStatus, name="task_occurrence_status"),
        nullable=False,
        default=TaskOccurrenceStatus.TODO,
    )
    progress_count: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="For counter tasks: 0..target"
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_by_actor_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    completed_by_actor_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    skipped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    skipped_by_actor_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    skip_reason: Mapped[SkipReason | None] = mapped_column(
        Enum(SkipReason, name="skip_reason"), nullable=True
    )


class ActivityLog(Base):
    """IMMUTABLE activity log — append-only audit trail.

    Records every task state change: who did what, when.
    Critical for medication tasks where actor identity matters.
    """

    __tablename__ = "activity_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    task_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    occurrence_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    actor_type: Mapped[ActorType] = mapped_column(
        Enum(ActorType, name="activity_actor_type"), nullable=False
    )
    actor_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    action: Mapped[ActivityAction] = mapped_column(
        Enum(ActivityAction, name="activity_action"), nullable=False
    )
    metadata_json: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True, comment="Additional context"
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class DailySummaryLog(Base):
    """Daily summary report sent to family at 22:00 local time.

    Contains completed and pending tasks for the day.
    IMMUTABLE — created once per patient per day.
    """

    __tablename__ = "daily_summary_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    date_local: Mapped[date] = mapped_column(Date, nullable=False)
    completed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pending_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completed_tasks: Mapped[list[dict]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        comment='[{"task_id", "title", "subtype", "completed_at", "completed_by_actor_type"}]',
    )
    pending_tasks: Mapped[list[dict]] = mapped_column(
        JSONB, nullable=False, default=list, comment='[{"task_id", "title", "subtype"}]'
    )
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    sent_to_family_ids: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, default=list
    )
