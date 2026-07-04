"""Task endpoints.

GET    /api/v1/tasks/today                        — bugünün occurrence listesi
POST   /api/v1/tasks                              — yeni görev tanımı
POST   /api/v1/tasks/occurrences/{id}/complete    — tamamla
POST   /api/v1/tasks/occurrences/{id}/undo        — geri al (10sn pencere)
POST   /api/v1/tasks/occurrences/{id}/skip        — atla
POST   /api/v1/tasks/occurrences/{id}/increment   — sayaç +1
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.schemas.tasks import CreateTaskIn, OccurrenceOut, TodayTaskOut
from app.services import task_service

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


@router.get("/today", response_model=list[TodayTaskOut])
async def get_today(user: CurrentUser, db: AsyncSession = Depends(get_db)) -> list[TodayTaskOut]:
    return await task_service.get_today_tasks(user, db)


@router.post("", response_model=TodayTaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: CreateTaskIn, user: CurrentUser, db: AsyncSession = Depends(get_db)
) -> TodayTaskOut:
    try:
        return await task_service.create_task(user, data, db)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc


@router.post("/occurrences/{occurrence_id}/complete", response_model=OccurrenceOut)
async def complete(
    occurrence_id: str, user: CurrentUser, db: AsyncSession = Depends(get_db)
) -> OccurrenceOut:
    try:
        return await task_service.complete_occurrence(user, occurrence_id, db)
    except ValueError as exc:
        _map_error(exc)


@router.post("/occurrences/{occurrence_id}/undo", response_model=OccurrenceOut)
async def undo(
    occurrence_id: str, user: CurrentUser, db: AsyncSession = Depends(get_db)
) -> OccurrenceOut:
    try:
        return await task_service.undo_occurrence(user, occurrence_id, db)
    except ValueError as exc:
        _map_error(exc)


@router.post("/occurrences/{occurrence_id}/skip", response_model=OccurrenceOut)
async def skip(
    occurrence_id: str, user: CurrentUser, db: AsyncSession = Depends(get_db)
) -> OccurrenceOut:
    try:
        return await task_service.skip_occurrence(user, occurrence_id, db)
    except ValueError as exc:
        _map_error(exc)


@router.post("/occurrences/{occurrence_id}/increment", response_model=OccurrenceOut)
async def increment(
    occurrence_id: str, user: CurrentUser, db: AsyncSession = Depends(get_db)
) -> OccurrenceOut:
    try:
        return await task_service.increment_counter(user, occurrence_id, db)
    except ValueError as exc:
        _map_error(exc)


def _map_error(exc: ValueError) -> None:
    msg = str(exc)
    if msg == "not_found":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task occurrence not found.")
    if msg == "not_todo":
        raise HTTPException(status.HTTP_409_CONFLICT, "Task is not in todo state.")
    if msg == "not_done":
        raise HTTPException(status.HTTP_409_CONFLICT, "Task is not done.")
    if msg == "undo_window_expired":
        raise HTTPException(status.HTTP_409_CONFLICT, "Undo window has expired.")
    if msg == "already_done":
        raise HTTPException(status.HTTP_409_CONFLICT, "Counter task is already done.")
    raise HTTPException(status.HTTP_400_BAD_REQUEST, msg)
