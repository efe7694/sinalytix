"""Call endpoints.

GET  /api/v1/calls/availability   — caregiver/EC availability for call buttons
POST /api/v1/calls/log            — append-only call attempt log
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.schemas.calls import AvailabilityOut, CallAttemptOut, LogCallIn
from app.services import calls_service

router = APIRouter(prefix="/api/v1/calls", tags=["calls"])


@router.get("/availability", response_model=AvailabilityOut)
async def get_availability(
    user: CurrentUser, db: AsyncSession = Depends(get_db)
) -> AvailabilityOut:
    return await calls_service.get_availability(user, db)


@router.post("/log", response_model=CallAttemptOut, status_code=status.HTTP_201_CREATED)
async def log_call(
    data: LogCallIn, user: CurrentUser, db: AsyncSession = Depends(get_db)
) -> CallAttemptOut:
    try:
        return await calls_service.log_call(user, data, db)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
