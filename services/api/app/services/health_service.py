"""Health profile service — get, update, medications."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import DataSource, HealthProfileField, MedicationStatus
from app.models.health import HealthProfile, HealthProfileAuditLog, MedicationRecord
from app.models.user import User
from app.schemas.health import (
    CreateMedicationIn,
    HealthProfileOut,
    HealthProfileResponse,
    MedicationOut,
    UpdateHealthProfileIn,
)


async def get_health_profile(patient: User, db: AsyncSession) -> HealthProfileResponse:
    """Return health profile and active medications. Creates profile if missing."""
    profile = await _get_or_create_profile(patient, db)
    medications = await _list_active_medications(patient, db)

    return HealthProfileResponse(
        profile=_profile_to_out(profile),
        medications=medications,
    )


async def update_health_profile(
    patient: User, data: UpdateHealthProfileIn, db: AsyncSession
) -> HealthProfileResponse:
    """Partial update of health profile with audit logging."""
    profile = await _get_or_create_profile(patient, db)
    now = datetime.now(timezone.utc)

    if data.conditions is not None and data.conditions != profile.conditions:
        db.add(HealthProfileAuditLog(
            user_id=str(patient.id),
            field_changed=HealthProfileField.CONDITIONS,
            previous_value={"conditions": profile.conditions},
            new_value={"conditions": data.conditions},
            changed_by_actor="patient",
            changed_at=now,
        ))
        profile.conditions = data.conditions

    if data.conditions_other_text is not None:
        profile.conditions_other_text = data.conditions_other_text

    if data.allergies is not None and data.allergies != profile.allergies:
        db.add(HealthProfileAuditLog(
            user_id=str(patient.id),
            field_changed=HealthProfileField.ALLERGIES,
            previous_value={"allergies": profile.allergies},
            new_value={"allergies": data.allergies},
            changed_by_actor="patient",
            changed_at=now,
        ))
        profile.allergies = data.allergies

    if data.allergy_flag is not None:
        from app.models.enums import AllergyFlag
        profile.allergy_flag = AllergyFlag(data.allergy_flag)

    if data.allergy_notes_text is not None:
        profile.allergy_notes_text = data.allergy_notes_text

    if data.declared_confidence is not None:
        from app.models.enums import DeclaredConfidence
        profile.declared_confidence = DeclaredConfidence(data.declared_confidence)

    profile.last_updated_by = "patient"
    await db.flush()

    medications = await _list_active_medications(patient, db)
    return HealthProfileResponse(profile=_profile_to_out(profile), medications=medications)


async def add_medication(
    patient: User, data: CreateMedicationIn, db: AsyncSession
) -> MedicationOut:
    """Add a new medication record."""
    med = MedicationRecord(
        user_id=str(patient.id),
        name=data.name,
        dose=data.dose,
        frequency=data.frequency,
        start_date=data.start_date,
        status=MedicationStatus.ACTIVE,
        data_source=DataSource.MANUAL,
        created_by_actor_type="patient",
    )
    db.add(med)
    await db.flush()
    await db.refresh(med)

    # Log audit
    db.add(HealthProfileAuditLog(
        user_id=str(patient.id),
        field_changed=HealthProfileField.MEDICATION_ADDED,
        previous_value=None,
        new_value={"medication_id": str(med.id), "name": med.name},
        changed_by_actor="patient",
    ))

    return _medication_to_out(med)


async def delete_medication(
    patient: User, medication_id: str, db: AsyncSession
) -> None:
    """Soft-delete a medication record."""
    med = await db.get(MedicationRecord, medication_id)
    if not med or med.user_id != str(patient.id) or med.deleted_at:
        raise ValueError("not_found")

    now = datetime.now(timezone.utc)
    med.deleted_at = now
    med.status = MedicationStatus.ARCHIVED

    db.add(HealthProfileAuditLog(
        user_id=str(patient.id),
        field_changed=HealthProfileField.MEDICATION_REMOVED,
        previous_value={"medication_id": medication_id, "name": med.name},
        new_value=None,
        changed_by_actor="patient",
        changed_at=now,
    ))


async def _get_or_create_profile(patient: User, db: AsyncSession) -> HealthProfile:
    result = await db.execute(
        select(HealthProfile).where(HealthProfile.user_id == str(patient.id))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        profile = HealthProfile(user_id=str(patient.id))
        db.add(profile)
        await db.flush()
        await db.refresh(profile)
    return profile


async def _list_active_medications(patient: User, db: AsyncSession) -> list[MedicationOut]:
    result = await db.execute(
        select(MedicationRecord).where(
            MedicationRecord.user_id == str(patient.id),
            MedicationRecord.deleted_at.is_(None),
        )
    )
    return [_medication_to_out(m) for m in result.scalars().all()]


def _profile_to_out(profile: HealthProfile) -> HealthProfileOut:
    return HealthProfileOut(
        profile_id=str(profile.id),
        conditions=profile.conditions,
        conditions_other_text=profile.conditions_other_text,
        allergies=profile.allergies,
        allergy_flag=profile.allergy_flag.value,
        allergy_notes_text=profile.allergy_notes_text,
        declared_confidence=profile.declared_confidence.value,
    )


def _medication_to_out(med: MedicationRecord) -> MedicationOut:
    return MedicationOut(
        medication_id=str(med.id),
        name=med.name,
        dose=med.dose,
        frequency=med.frequency,
        start_date=med.start_date,
        status=med.status.value,
        data_source=med.data_source.value,
    )
