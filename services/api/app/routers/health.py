"""Health profile endpoints.

GET    /api/v1/health-profile                     — profile + medications
PUT    /api/v1/health-profile                     — update profile
POST   /api/v1/health-profile/medications         — add medication
DELETE /api/v1/health-profile/medications/{id}    — soft-delete medication
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.schemas.health import (
    CreateMedicationIn,
    HealthProfileResponse,
    MedicationOut,
    UpdateHealthProfileIn,
)
from app.services import health_service

router = APIRouter(prefix="/api/v1/health-profile", tags=["health"])


@router.get("", response_model=HealthProfileResponse)
async def get_health_profile(
    user: CurrentUser, db: AsyncSession = Depends(get_db)
) -> HealthProfileResponse:
    return await health_service.get_health_profile(user, db)


@router.put("", response_model=HealthProfileResponse)
async def update_health_profile(
    data: UpdateHealthProfileIn,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> HealthProfileResponse:
    return await health_service.update_health_profile(user, data, db)


@router.post("/medications", response_model=MedicationOut, status_code=status.HTTP_201_CREATED)
async def add_medication(
    data: CreateMedicationIn,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> MedicationOut:
    return await health_service.add_medication(user, data, db)


@router.delete("/medications/{medication_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medication(
    medication_id: str,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        await health_service.delete_medication(user, medication_id, db)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Medication not found.") from exc
