"""Family app endpoints.

Family members are linked to patients via EmergencyContact.linked_family_user_id.
All endpoints require Bearer auth and verify the calling user is a linked family member
for the requested patient.

GET    /family/profile                              — family member profile + linked patients
GET    /family/patients/{patient_id}/tasks/today   — today's task list (read-only)
POST   /family/tasks                               — add a task (family-created)
POST   /family/tasks/occurrences/{id}/carry-over   — carry-over a single task
POST   /family/patients/{patient_id}/tasks/carry-over-all — carry-over all pending
GET    /family/patients/{patient_id}/conversations  — conversation list
GET    /family/conversations/{id}/messages          — message list
POST   /family/conversations/{id}/messages          — send message
GET    /family/patients/{patient_id}/shift/active   — current active shift
GET    /family/patients/{patient_id}/shifts         — shift history
GET    /family/patients/{patient_id}/sos/active     — active SOS event
POST   /family/patients/{patient_id}/sos/dismiss    — dismiss SOS
GET    /family/patients/{patient_id}/symptoms/latest-unread — latest unread symptom
GET    /family/symptoms/{symptom_id}                — symptom detail
GET    /family/patients/{patient_id}/reports/{date} — daily report
GET    /family/patients/{patient_id}/approvals      — approval requests
PATCH  /family/patients/{patient_id}/approvals/{id} — decide on approval
GET    /family/availability/{patient_id}            — DND status
PATCH  /family/availability/{patient_id}            — toggle DND
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.models.caregiver import CaregiverShift, FamilyAvailability
from app.models.emergency_contact import EmergencyContact
from app.models.task import TaskDefinition, TaskOccurrence
from app.models.user import User
from app.schemas.messaging import ConversationOut, MessageOut, SendMessageIn
from app.schemas.tasks import CreateTaskIn, TodayTaskOut
from app.services import messaging_service, task_service

router = APIRouter(prefix="/family", tags=["family"])


# ── Helpers ──────────────────────────────────────────────


async def _get_ec_link(db: AsyncSession, family_user_id: str, patient_id: str) -> EmergencyContact:
    """Verify and return the EC link between family member and patient."""
    result = await db.execute(
        select(EmergencyContact).where(
            and_(
                EmergencyContact.linked_family_user_id == family_user_id,
                EmergencyContact.user_id == patient_id,
                EmergencyContact.deleted_at.is_(None),
            )
        )
    )
    ec = result.scalar_one_or_none()
    if ec is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not linked to this patient.",
        )
    return ec


# ── Profile & Patient List ────────────────────────────────


class LinkedPatientOut(BaseModel):
    patient_id: str
    first_name: str
    last_name: str
    relationship: str
    permission_level: str  # view | edit | full — TODO: add DB column in v1
    is_primary: bool


class FamilyProfileOut(BaseModel):
    user_id: str
    first_name: str
    last_name: str
    relationship: str | None
    linked_patients: list[LinkedPatientOut]


@router.get("/profile", response_model=FamilyProfileOut)
async def get_profile(
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> FamilyProfileOut:
    """Return family member profile with all linked patients."""
    result = await db.execute(
        select(EmergencyContact, User)
        .join(User, User.id == EmergencyContact.user_id)
        .where(
            and_(
                EmergencyContact.linked_family_user_id == str(user.id),
                EmergencyContact.deleted_at.is_(None),
            )
        )
    )
    rows = result.all()

    patients = [
        LinkedPatientOut(
            patient_id=str(patient.id),
            first_name=patient.first_name,
            last_name=patient.last_name,
            relationship=ec.relationship.value,
            permission_level="view",  # TODO: add permission_level to EmergencyContact in v1
            is_primary=ec.is_primary,
        )
        for ec, patient in rows
    ]

    first_rel = rows[0][0].relationship.value if rows else None

    return FamilyProfileOut(
        user_id=str(user.id),
        first_name=user.first_name,
        last_name=user.last_name,
        relationship=first_rel,
        linked_patients=patients,
    )


# ── Tasks ─────────────────────────────────────────────────


@router.get("/patients/{patient_id}/tasks/today", response_model=list[TodayTaskOut])
async def get_today_tasks(
    patient_id: str,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[TodayTaskOut]:
    await _get_ec_link(db, str(user.id), patient_id)
    patient_result = await db.execute(select(User).where(User.id == patient_id))
    patient = patient_result.scalar_one_or_none()
    if patient is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found.")
    return await task_service.get_today_tasks(patient, db)


@router.post("/tasks", response_model=TodayTaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: CreateTaskIn,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> TodayTaskOut:
    """Family members can add tasks scoped to a patient."""
    if not hasattr(data, "patient_id") or not data.patient_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "patient_id is required.")
    await _get_ec_link(db, str(user.id), data.patient_id)
    try:
        return await task_service.create_task(user, data, db)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc


class CarryOverIn(BaseModel):
    target_date: str  # YYYY-MM-DD


@router.post(
    "/tasks/occurrences/{occurrence_id}/carry-over", status_code=status.HTTP_204_NO_CONTENT
)
async def carry_over_task(
    occurrence_id: str,
    data: CarryOverIn,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Reschedule a pending task occurrence to a future date."""
    result = await db.execute(select(TaskOccurrence).where(TaskOccurrence.id == occurrence_id))
    occ = result.scalar_one_or_none()
    if occ is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task occurrence not found.")

    task_result = await db.execute(select(TaskDefinition).where(TaskDefinition.id == occ.task_id))
    task_def = task_result.scalar_one_or_none()
    if task_def is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task definition not found.")

    await _get_ec_link(db, str(user.id), str(task_def.patient_id))

    occ.date_local = data.target_date
    await db.commit()


@router.post("/patients/{patient_id}/tasks/carry-over-all", status_code=status.HTTP_204_NO_CONTENT)
async def carry_over_all(
    patient_id: str,
    data: CarryOverIn,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Carry all pending task occurrences to a target date."""
    await _get_ec_link(db, str(user.id), patient_id)

    today = datetime.now(UTC).date().isoformat()
    result = await db.execute(
        select(TaskOccurrence)
        .join(TaskDefinition, TaskDefinition.id == TaskOccurrence.task_id)
        .where(
            and_(
                TaskDefinition.patient_id == patient_id,
                TaskOccurrence.date_local == today,
                TaskOccurrence.status == "todo",
            )
        )
    )
    occurrences = result.scalars().all()
    for occ in occurrences:
        occ.date_local = data.target_date
    await db.commit()


# ── Messaging ─────────────────────────────────────────────


@router.get("/patients/{patient_id}/conversations", response_model=list[ConversationOut])
async def list_conversations(
    patient_id: str,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[ConversationOut]:
    await _get_ec_link(db, str(user.id), patient_id)
    return await messaging_service.list_conversations(user, db)


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
async def list_messages(
    conversation_id: str,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[MessageOut]:
    try:
        return await messaging_service.list_messages(user, conversation_id, db)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found.") from exc


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    conversation_id: str,
    data: SendMessageIn,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> MessageOut:
    try:
        return await messaging_service.send_message(user, conversation_id, data, db)
    except ValueError as exc:
        msg = str(exc)
        if msg == "not_found":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found.") from exc
        if msg == "conversation_archived":
            raise HTTPException(status.HTTP_409_CONFLICT, "Conversation is archived.") from exc
        raise HTTPException(status.HTTP_400_BAD_REQUEST, msg) from exc


# ── Shifts ────────────────────────────────────────────────


class ShiftOut(BaseModel):
    shift_id: str
    caregiver_name: str
    caregiver_agency: str | None
    status: str  # active | completed | cancelled
    check_in_at: datetime | None
    check_out_at: datetime | None
    duration_minutes: int | None
    notes: str | None
    tasks_completed: int
    tasks_total: int
    location_verified: bool


class ShiftHistoryItemOut(BaseModel):
    shift_id: str
    caregiver_name: str
    status: str
    check_in_at: datetime | None
    check_out_at: datetime | None
    duration_minutes: int | None


async def _shift_to_out(shift: CaregiverShift, db: AsyncSession) -> ShiftOut:
    caregiver_result = await db.execute(select(User).where(User.id == shift.caregiver_id))
    caregiver = caregiver_result.scalar_one_or_none()
    caregiver_name = f"{caregiver.first_name} {caregiver.last_name}" if caregiver else "Bakıcı"

    shift_status = (
        "active"
        if shift.shift_active
        else (
            "cancelled"
            if shift.check_out_reason and shift.check_out_reason.value == "auto_switch"
            else "completed"
        )
    )

    return ShiftOut(
        shift_id=str(shift.id),
        caregiver_name=caregiver_name,
        caregiver_agency=None,
        status=shift_status,
        check_in_at=shift.checked_in_at,
        check_out_at=shift.checked_out_at,
        duration_minutes=shift.duration_minutes,
        notes=shift.shift_note,
        tasks_completed=0,
        tasks_total=0,
        location_verified=False,
    )


@router.get("/patients/{patient_id}/shift/active", response_model=ShiftOut | None)
async def get_active_shift(
    patient_id: str,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ShiftOut | None:
    await _get_ec_link(db, str(user.id), patient_id)
    result = await db.execute(
        select(CaregiverShift).where(
            and_(
                CaregiverShift.patient_id == patient_id,
                CaregiverShift.shift_active.is_(True),
            )
        )
    )
    shift = result.scalar_one_or_none()
    if shift is None:
        return None
    return await _shift_to_out(shift, db)


@router.get("/patients/{patient_id}/shifts", response_model=list[ShiftHistoryItemOut])
async def list_shifts(
    patient_id: str,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[ShiftHistoryItemOut]:
    await _get_ec_link(db, str(user.id), patient_id)
    result = await db.execute(
        select(CaregiverShift, User)
        .join(User, User.id == CaregiverShift.caregiver_id)
        .where(
            and_(
                CaregiverShift.patient_id == patient_id,
                CaregiverShift.shift_active.is_(False),
            )
        )
        .order_by(CaregiverShift.checked_in_at.desc())
        .limit(20)
    )
    rows = result.all()
    return [
        ShiftHistoryItemOut(
            shift_id=str(shift.id),
            caregiver_name=f"{caregiver.first_name} {caregiver.last_name}",
            status="completed",
            check_in_at=shift.checked_in_at,
            check_out_at=shift.checked_out_at,
            duration_minutes=shift.duration_minutes,
        )
        for shift, caregiver in rows
    ]


# ── DND (Do Not Disturb) ──────────────────────────────────


class DndOut(BaseModel):
    dnd: bool


class DndIn(BaseModel):
    dnd: bool


@router.get("/availability/{patient_id}", response_model=DndOut)
async def get_dnd(
    patient_id: str,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> DndOut:
    await _get_ec_link(db, str(user.id), patient_id)
    result = await db.execute(
        select(FamilyAvailability).where(
            and_(
                FamilyAvailability.family_member_id == str(user.id),
                FamilyAvailability.patient_id == patient_id,
            )
        )
    )
    fa = result.scalar_one_or_none()
    return DndOut(dnd=fa.dnd if fa else False)


@router.patch("/availability/{patient_id}", response_model=DndOut)
async def set_dnd(
    patient_id: str,
    data: DndIn,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> DndOut:
    await _get_ec_link(db, str(user.id), patient_id)
    result = await db.execute(
        select(FamilyAvailability).where(
            and_(
                FamilyAvailability.family_member_id == str(user.id),
                FamilyAvailability.patient_id == patient_id,
            )
        )
    )
    fa = result.scalar_one_or_none()
    if fa is None:
        fa = FamilyAvailability(
            family_member_id=str(user.id),
            patient_id=patient_id,
            dnd=data.dnd,
        )
        db.add(fa)
    else:
        fa.dnd = data.dnd
    await db.commit()
    return DndOut(dnd=fa.dnd)


# ── Stubs (symptoms, reports, approvals, SOS) ─────────────
# These require dedicated service implementations in v1.
# Returning empty/null responses keeps the app functional during testing.


class SymptomPreviewOut(BaseModel):
    report_id: str
    symptom_text: str
    created_at: datetime
    unread_count: int


@router.get(
    "/patients/{patient_id}/symptoms/latest-unread", response_model=SymptomPreviewOut | None
)
async def latest_unread_symptom(
    patient_id: str,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    await _get_ec_link(db, str(user.id), patient_id)
    return None  # TODO: implement in v1


@router.get("/symptoms/{symptom_id}")
async def get_symptom(
    symptom_id: str,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    # TODO: implement in v1 — query symptom_reports table
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Symptom detail not yet implemented.")


@router.get("/patients/{patient_id}/reports/{report_date}")
async def get_daily_report(
    patient_id: str,
    report_date: str,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    # TODO: implement in v1 — query daily_summary_logs table
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Daily report not yet implemented.")


@router.get("/patients/{patient_id}/approvals")
async def list_approvals(
    patient_id: str,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list:
    await _get_ec_link(db, str(user.id), patient_id)
    return []  # TODO: implement in v1


@router.patch(
    "/patients/{patient_id}/approvals/{approval_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def decide_approval(
    patient_id: str,
    approval_id: str,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    await _get_ec_link(db, str(user.id), patient_id)
    # TODO: implement in v1


@router.get("/patients/{patient_id}/sos/active")
async def get_active_sos(
    patient_id: str,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict | None:
    await _get_ec_link(db, str(user.id), patient_id)
    return None  # TODO: implement in v1 — query red_escalation_logs


@router.post("/patients/{patient_id}/sos/dismiss", status_code=status.HTTP_204_NO_CONTENT)
async def dismiss_sos(
    patient_id: str,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    await _get_ec_link(db, str(user.id), patient_id)
    # TODO: implement in v1


@router.post("/sina/chat")
async def sina_chat(
    patient_id: str,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    # TODO: implement in v1 — proxy to AI service with family-scoped context
    raise HTTPException(
        status.HTTP_501_NOT_IMPLEMENTED, "Sina chat not yet implemented for family."
    )
