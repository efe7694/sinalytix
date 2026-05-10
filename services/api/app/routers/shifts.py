"""Caregiver shift management endpoints.

PRD rules enforced here:
- At most 1 active shift per caregiver (DB partial unique index is the primary guard)
- Auto-switch: atomic checkout → checkin transaction
- 24h alert flag prevents duplicate push notifications
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.caregiver import (
    ActiveShiftResponse,
    ShiftCheckInRequest,
    ShiftCheckOutRequest,
    ShiftHistoryItem,
    ShiftResponse,
)
from app.services.shift_service import ShiftService

router = APIRouter(prefix="/shifts", tags=["shifts"])


@router.get("/active", response_model=ActiveShiftResponse)
async def get_active_shift(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return current active shift state — loaded on Home screen."""
    service = ShiftService(db)
    shift = await service.get_active_shift(current_user.id)
    if shift:
        return ActiveShiftResponse(has_active_shift=True, active_shift=shift)
    return ActiveShiftResponse(has_active_shift=False)


@router.post("/checkin", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
async def check_in(
    payload: ShiftCheckInRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start a shift for the given patient.

    Raises 409 if caregiver already has an active shift for a different patient
    (frontend should show auto-switch confirmation popup first and call /switch).
    """
    service = ShiftService(db)
    return await service.check_in(current_user.id, payload)


@router.post("/checkout", response_model=ShiftResponse)
async def check_out(
    payload: ShiftCheckOutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """End the currently active shift."""
    service = ShiftService(db)
    shift = await service.check_out(current_user.id, payload)
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No active shift to close"
        )
    return shift


@router.post("/switch", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
async def switch_patient(
    payload: ShiftCheckInRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Atomically close current active shift and open a new one (auto-switch).

    Called after user confirms the switch popup in the UI.
    """
    service = ShiftService(db)
    return await service.switch_patient(current_user.id, payload)


@router.get("/history", response_model=list[ShiftHistoryItem])
async def get_shift_history(
    limit: int = Query(default=30, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return paginated shift history for the caregiver."""
    service = ShiftService(db)
    return await service.get_history(current_user.id, limit=limit, offset=offset)
