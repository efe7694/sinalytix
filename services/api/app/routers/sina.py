"""Sina AI agent endpoints.

POST /api/v1/sina/sessions                          — create voice session
POST /api/v1/sina/sessions/{id}/audio               — submit audio (multipart)
POST /api/v1/sina/actions/{action_id}/execute       — execute proposed action
POST /api/v1/sina/sessions/{id}/cancel              — cancel session
POST /api/v1/sina/sessions/{id}/red-escalate        — trigger red escalation
GET  /api/v1/sina/sessions/{id}/escalation-status   — poll escalation status
"""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.schemas.sina import (
    CancelSessionIn,
    CreateSessionIn,
    CreateSessionOut,
    EscalationStatusOut,
    ExecuteActionIn,
    SinaResponse,
)
from app.services import sina_service

router = APIRouter(prefix="/api/v1/sina", tags=["sina"])


@router.post("/sessions", response_model=CreateSessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    data: CreateSessionIn,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> CreateSessionOut:
    return await sina_service.create_session(user, data, db)


@router.post("/sessions/{session_id}/audio", response_model=SinaResponse)
async def submit_audio(
    session_id: str,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    audio: UploadFile = File(...),
) -> SinaResponse:
    try:
        content = await audio.read()
        return await sina_service.process_audio(user, session_id, content, db)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found.")


@router.post("/actions/{action_id}/execute", status_code=status.HTTP_204_NO_CONTENT)
async def execute_action(
    action_id: str,
    data: ExecuteActionIn,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        await sina_service.execute_action(user, action_id, data, db)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Action not found.")


@router.post("/sessions/{session_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_session(
    session_id: str,
    data: CancelSessionIn,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        await sina_service.cancel_session(user, session_id, data, db)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found.")


@router.post("/sessions/{session_id}/red-escalate", response_model=EscalationStatusOut)
async def red_escalate(
    session_id: str,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> EscalationStatusOut:
    try:
        return await sina_service.trigger_red_escalation(user, session_id, db)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found.")


@router.get("/sessions/{session_id}/escalation-status", response_model=EscalationStatusOut)
async def escalation_status(
    session_id: str,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> EscalationStatusOut:
    try:
        return await sina_service.get_escalation_status(user, session_id, db)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No escalation found for this session.")
