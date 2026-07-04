"""Calls service — log call attempts and check contact availability."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.call import CallAttemptLog
from app.models.caregiver import CaregiverLink, CaregiverShift
from app.models.emergency_contact import EmergencyContact
from app.models.enums import (
    CallCancelStage,
    CallStatus,
    CallTargetType,
    CallType,
    CaregiverLinkStatus,
)
from app.models.user import User
from app.schemas.calls import AvailabilityOut, CallAttemptOut, LogCallIn


async def get_availability(patient: User, db: AsyncSession) -> AvailabilityOut:
    """Return contact availability for the patient's call buttons."""
    # Primary emergency contact
    ec_result = await db.execute(
        select(EmergencyContact)
        .where(
            EmergencyContact.user_id == str(patient.id),
            EmergencyContact.deleted_at.is_(None),
            EmergencyContact.is_primary.is_(True),
        )
        .limit(1)
    )
    ec = ec_result.scalar_one_or_none()

    # Linked caregiver with active shift
    caregiver_available = False
    caregiver_phone: str | None = None
    caregiver_name: str | None = None

    link_result = await db.execute(
        select(CaregiverLink)
        .where(
            CaregiverLink.patient_id == str(patient.id),
            CaregiverLink.status == CaregiverLinkStatus.LINKED,
            CaregiverLink.caregiver_id.is_not(None),
        )
        .limit(1)
    )
    link = link_result.scalar_one_or_none()

    if link and link.caregiver_id:
        shift_result = await db.execute(
            select(CaregiverShift)
            .where(
                CaregiverShift.caregiver_id == link.caregiver_id,
                CaregiverShift.patient_id == str(patient.id),
                CaregiverShift.shift_active.is_(True),
            )
            .limit(1)
        )
        shift = shift_result.scalar_one_or_none()
        if shift:
            caregiver_available = True
            caregiver_phone = shift.caregiver_phone
            caregiver_user = await db.get(User, link.caregiver_id)
            if caregiver_user:
                caregiver_name = caregiver_user.display_name
                if not caregiver_phone:
                    caregiver_phone = caregiver_user.phone

    return AvailabilityOut(
        caregiver_available=caregiver_available,
        caregiver_phone=caregiver_phone,
        caregiver_name=caregiver_name,
        family_available=ec is not None,
        family_phone=ec.phone if ec else None,
        family_name=ec.name if ec else None,
        ec_primary={
            "ec_id": str(ec.id),
            "phone": ec.phone,
            "name": ec.name,
        }
        if ec
        else None,
    )


async def log_call(patient: User, data: LogCallIn, db: AsyncSession) -> CallAttemptOut:
    """Append-only call attempt log entry."""
    log = CallAttemptLog(
        patient_id=str(patient.id),
        call_type=CallType(data.call_type),
        target_type=CallTargetType(data.target_type),
        target_id=data.target_id,
        status=CallStatus(data.status),
        cancel_stage=CallCancelStage(data.cancel_stage) if data.cancel_stage else None,
        initiated_at=data.initiated_at,
        ended_at=data.ended_at,
    )
    db.add(log)
    await db.flush()
    await db.refresh(log)

    return CallAttemptOut(
        id=str(log.id),
        call_type=log.call_type.value,
        target_type=log.target_type.value,
        target_id=log.target_id,
        status=log.status.value,
        cancel_stage=log.cancel_stage.value if log.cancel_stage else None,
        initiated_at=log.initiated_at,
    )
