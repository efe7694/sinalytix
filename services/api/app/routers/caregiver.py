"""Caregiver app endpoints — onboarding, profile, linked patients."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.caregiver import (
    CaregiverOnboardingCompleteRequest,
    CaregiverProfileResponse,
    LinkedPatientSummary,
)
from app.services.caregiver_service import CaregiverService

router = APIRouter(prefix="/caregiver", tags=["caregiver"])


@router.post("/onboarding/complete", response_model=CaregiverProfileResponse)
async def complete_onboarding(
    payload: CaregiverOnboardingCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Transfer local onboarding draft to backend after successful auth.

    Idempotent — safe to retry on network failure.
    """
    service = CaregiverService(db)
    return await service.complete_onboarding(current_user.id, payload)


@router.get("/profile", response_model=CaregiverProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CaregiverService(db)
    profile = await service.get_profile(current_user.id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile


@router.get("/patients", response_model=list[LinkedPatientSummary])
async def list_linked_patients(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all patients linked to this caregiver (via CaregiverLink)."""
    service = CaregiverService(db)
    return await service.list_linked_patients(current_user.id)


@router.post("/patients/link")
async def link_patient(
    link_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Consume a 6-char patient-generated code to establish a caregiver link."""
    service = CaregiverService(db)
    return await service.link_patient(current_user.id, link_code)
