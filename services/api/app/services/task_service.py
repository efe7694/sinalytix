"""Task service — today list, complete/undo/skip/increment, create.

Occurrence generation strategy:
  On GET /tasks/today, we check every active TaskDefinition for the patient
  and create a TaskOccurrence for today if the schedule qualifies and one
  doesn't already exist. This avoids needing a scheduled job for V0.

Undo window:
  Backend enforces 10 s (frontend shows button for 5 s — the extra 5 s
  accounts for network latency without allowing abuse).
"""

import calendar
from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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
from app.models.task import ActivityLog, TaskDefinition, TaskOccurrence, TaskSchedule
from app.models.user import User
from app.schemas.tasks import CreateTaskIn, OccurrenceOut, TodayTaskOut

_UNDO_WINDOW_SECONDS = 10


# ── Today list ────────────────────────────────────────────


async def get_today_tasks(user: User, db: AsyncSession) -> list[TodayTaskOut]:
    today = date.today()

    result = await db.execute(
        select(TaskDefinition, TaskSchedule)
        .join(TaskSchedule, TaskDefinition.id == TaskSchedule.task_id)
        .where(
            TaskDefinition.patient_id == str(user.id),
            TaskDefinition.status == TaskDefinitionStatus.ACTIVE,
        )
    )
    rows = result.all()

    out: list[TodayTaskOut] = []
    for task_def, schedule in rows:
        if not _qualifies_today(task_def, schedule, today):
            continue
        occ = await _get_or_create_occurrence(task_def, today, db)
        out.append(_to_today_out(task_def, schedule, occ))

    return out


# ── Create task ───────────────────────────────────────────


async def create_task(user: User, data: CreateTaskIn, db: AsyncSession) -> TodayTaskOut:
    today = date.today()
    task_type = TaskType(data.type)
    task_subtype = TaskSubtype(data.subtype)

    task_def = TaskDefinition(
        patient_id=str(user.id),
        title=data.title,
        type=task_type,
        subtype=task_subtype,
        created_by_actor_type=ActorType.PATIENT,
        created_by_actor_id=str(user.id),
        source_provenance=SourceProvenance.MANUAL,
    )
    db.add(task_def)
    await db.flush()

    due_date = None
    if data.due_date_local:
        due_date = date.fromisoformat(data.due_date_local)

    frequency = None
    if data.frequency:
        frequency = RecurrenceFrequency(data.frequency)

    schedule = TaskSchedule(
        task_id=str(task_def.id),
        due_date_local=due_date,
        frequency=frequency,
        days_of_week=data.days_of_week,
        target_per_day=data.target_per_day,
        reset_rule="daily" if task_type == TaskType.COUNTER else None,
    )
    db.add(schedule)
    await db.flush()

    occ = None
    if _qualifies_today(task_def, schedule, today):
        occ = await _get_or_create_occurrence(task_def, today, db)

    await _log(user, str(user.id), str(task_def.id), None, ActivityAction.CREATED, db)

    if occ is None:
        # Task doesn't appear today (e.g. one_time with future date) — return minimal occurrence
        return _to_today_out(task_def, schedule, None)

    return _to_today_out(task_def, schedule, occ)


# ── Complete ──────────────────────────────────────────────


async def complete_occurrence(user: User, occurrence_id: str, db: AsyncSession) -> OccurrenceOut:
    occ = await _fetch_patient_occurrence(user, occurrence_id, db)

    if occ.status != TaskOccurrenceStatus.TODO:
        raise ValueError("not_todo")

    occ.status = TaskOccurrenceStatus.DONE
    occ.completed_at = datetime.now(UTC)
    occ.completed_by_actor_type = str(user.role)
    occ.completed_by_actor_id = str(user.id)

    patient_id = await _patient_id_for_occurrence(occ, db)
    await _log(user, patient_id, str(occ.task_id), str(occ.id), ActivityAction.COMPLETED, db)
    await db.flush()
    return _to_occ_out(occ)


# ── Undo ──────────────────────────────────────────────────


async def undo_occurrence(user: User, occurrence_id: str, db: AsyncSession) -> OccurrenceOut:
    occ = await _fetch_patient_occurrence(user, occurrence_id, db)

    if occ.status != TaskOccurrenceStatus.DONE:
        raise ValueError("not_done")
    if occ.completed_at:
        elapsed = (datetime.now(UTC) - occ.completed_at).total_seconds()
        if elapsed > _UNDO_WINDOW_SECONDS:
            raise ValueError("undo_window_expired")

    occ.status = TaskOccurrenceStatus.TODO
    occ.completed_at = None
    occ.completed_by_actor_type = None
    occ.completed_by_actor_id = None

    patient_id = await _patient_id_for_occurrence(occ, db)
    await _log(user, patient_id, str(occ.task_id), str(occ.id), ActivityAction.UNDONE, db)
    await db.flush()
    return _to_occ_out(occ)


# ── Skip ──────────────────────────────────────────────────


async def skip_occurrence(user: User, occurrence_id: str, db: AsyncSession) -> OccurrenceOut:
    occ = await _fetch_patient_occurrence(user, occurrence_id, db)

    if occ.status != TaskOccurrenceStatus.TODO:
        raise ValueError("not_todo")

    occ.status = TaskOccurrenceStatus.SKIPPED
    occ.skipped_at = datetime.now(UTC)
    occ.skipped_by_actor_type = str(user.role)
    occ.skip_reason = SkipReason.MANUAL

    patient_id = await _patient_id_for_occurrence(occ, db)
    await _log(user, patient_id, str(occ.task_id), str(occ.id), ActivityAction.SKIPPED, db)
    await db.flush()
    return _to_occ_out(occ)


# ── Increment counter ─────────────────────────────────────


async def increment_counter(user: User, occurrence_id: str, db: AsyncSession) -> OccurrenceOut:
    occ = await _fetch_patient_occurrence(user, occurrence_id, db)

    if occ.status == TaskOccurrenceStatus.DONE:
        raise ValueError("already_done")

    result = await db.execute(select(TaskSchedule).where(TaskSchedule.task_id == str(occ.task_id)))
    schedule = result.scalar_one_or_none()
    target = schedule.target_per_day if schedule else None

    current = occ.progress_count or 0
    occ.progress_count = current + 1

    if target and occ.progress_count >= target:
        occ.status = TaskOccurrenceStatus.DONE
        occ.completed_at = datetime.now(UTC)
        occ.completed_by_actor_type = str(user.role)
        occ.completed_by_actor_id = str(user.id)

    patient_id = await _patient_id_for_occurrence(occ, db)
    await _log(user, patient_id, str(occ.task_id), str(occ.id), ActivityAction.COMPLETED, db)
    await db.flush()
    return _to_occ_out(occ)


# ── Internal helpers ──────────────────────────────────────


def _qualifies_today(task_def: TaskDefinition, schedule: TaskSchedule, today: date) -> bool:
    t = task_def.type
    if t == TaskType.ONE_TIME:
        return schedule.due_date_local == today
    if t == TaskType.COUNTER:
        return True
    if t == TaskType.RECURRING:
        if schedule.frequency == RecurrenceFrequency.DAILY:
            return True
        if schedule.frequency == RecurrenceFrequency.WEEKLY and schedule.days_of_week:
            day_abbr = calendar.day_abbr[today.weekday()].upper()
            return day_abbr in schedule.days_of_week
    return False


async def _get_or_create_occurrence(
    task_def: TaskDefinition, today: date, db: AsyncSession
) -> TaskOccurrence:
    result = await db.execute(
        select(TaskOccurrence).where(
            TaskOccurrence.task_id == str(task_def.id),
            TaskOccurrence.date_local == today,
        )
    )
    occ = result.scalar_one_or_none()
    if occ:
        return occ

    occ = TaskOccurrence(
        task_id=str(task_def.id),
        date_local=today,
        status=TaskOccurrenceStatus.TODO,
        progress_count=0 if task_def.type == TaskType.COUNTER else None,
    )
    db.add(occ)
    await db.flush()
    return occ


async def _fetch_patient_occurrence(
    user: User, occurrence_id: str, db: AsyncSession
) -> TaskOccurrence:
    result = await db.execute(
        select(TaskOccurrence)
        .join(TaskDefinition, TaskOccurrence.task_id == TaskDefinition.id)
        .where(
            TaskOccurrence.id == occurrence_id,
            TaskDefinition.patient_id == str(user.id),
        )
    )
    occ = result.scalar_one_or_none()
    if not occ:
        raise ValueError("not_found")
    return occ


async def _patient_id_for_occurrence(occ: TaskOccurrence, db: AsyncSession) -> str:
    result = await db.execute(select(TaskDefinition).where(TaskDefinition.id == str(occ.task_id)))
    task_def = result.scalar_one()
    return str(task_def.patient_id)


async def _log(
    user: User,
    patient_id: str,
    task_id: str,
    occurrence_id: str | None,
    action: ActivityAction,
    db: AsyncSession,
) -> None:
    db.add(
        ActivityLog(
            patient_id=patient_id,
            task_id=task_id,
            occurrence_id=occurrence_id,
            actor_type=ActorType(str(user.role)),
            actor_id=str(user.id),
            action=action,
        )
    )


def _to_today_out(
    task_def: TaskDefinition,
    schedule: TaskSchedule,
    occ: TaskOccurrence | None,
) -> TodayTaskOut:
    return TodayTaskOut(
        occurrence_id=str(occ.id) if occ else "",
        task_id=str(task_def.id),
        title=task_def.title,
        type=str(task_def.type),
        subtype=str(task_def.subtype),
        status=str(occ.status) if occ else "todo",
        progress_count=occ.progress_count if occ else None,
        target_per_day=schedule.target_per_day,
        created_by_actor_type=str(task_def.created_by_actor_type),
        completed_at=occ.completed_at if occ else None,
        skipped_at=occ.skipped_at if occ else None,
    )


def _to_occ_out(occ: TaskOccurrence) -> OccurrenceOut:
    return OccurrenceOut(
        occurrence_id=str(occ.id),
        status=str(occ.status),
        progress_count=occ.progress_count,
        completed_at=occ.completed_at,
        skipped_at=occ.skipped_at,
    )
