"""Sina AI agent service — voice session pipeline.

V1: Audio → stub ASR → stub LLM judge → proposed action.
Real ASR/LLM pipeline plugs in behind the same interface in Phase 2.

CRITICAL: Every session is logged to ai_interaction_logs regardless of outcome.
This is the Phase 1 data collection for fine-tuning.
"""

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import (
    ActionExecutionLog,
    AIInteractionLog,
    ProposedAction,
    RedEscalationLog,
    VoiceSession,
)
from app.models.enums import (
    ExecutedBy,
    ExecutionResult,
    RiskLevel,
    VoiceSessionStatus,
    VoiceTriggerSource,
)
from app.models.user import User
from app.schemas.sina import (
    CancelSessionIn,
    CreateSessionIn,
    CreateSessionOut,
    EscalationStatusOut,
    ExecuteActionIn,
    SinaResponse,
)

# Risk level → auto-confirm seconds (green=10, others=null per PRD)
_AUTO_CONFIRM_MAP = {RiskLevel.LOW: 10, RiskLevel.MEDIUM: None, RiskLevel.HIGH: None}


async def create_session(
    patient: User, data: CreateSessionIn, db: AsyncSession
) -> CreateSessionOut:
    """Start a new voice session."""
    session = VoiceSession(
        patient_id=str(patient.id),
        trigger_source=VoiceTriggerSource(data.trigger_source),
        started_at=datetime.now(UTC),
        status=VoiceSessionStatus.PROCESSING,
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return CreateSessionOut(session_id=str(session.id), status=session.status.value)


async def process_audio(
    patient: User,
    session_id: str,
    audio_content: bytes,
    db: AsyncSession,
) -> SinaResponse:
    """Process audio for a voice session.

    V1 stub: returns a no-op response. Real ASR/LLM wires here in Phase 2.
    All inputs are logged to ai_interaction_logs for training data.
    """
    session = await db.get(VoiceSession, session_id)
    if not session or session.patient_id != str(patient.id):
        raise ValueError("not_found")

    # Log every interaction for Phase 2 fine-tuning
    db.add(
        AIInteractionLog(
            model_version="stub-v1",
            input_text="[audio_bytes]",
            output_text="[stub_no_action]",
            output_structured=None,
            confidence_score=None,
            latency_ms=0,
            context={"patient_id": str(patient.id), "session_id": session_id},
        )
    )

    session.status = VoiceSessionStatus.AWAITING_USER
    await db.flush()

    return SinaResponse(
        session_id=session_id,
        proposed_action=None,
        clarification_questions=[],
        blocked_message=None,
        general_life_response="Şu an sesi anlayamadım. Lütfen tekrar deneyin.",
    )


async def execute_action(
    patient: User,
    action_id: str,
    data: ExecuteActionIn,
    db: AsyncSession,
) -> None:
    """Log the execution result of a proposed action."""
    action = await db.get(ProposedAction, action_id)
    if not action:
        raise ValueError("not_found")

    session = await db.get(VoiceSession, str(action.session_id))
    if not session or session.patient_id != str(patient.id):
        raise ValueError("not_found")

    db.add(
        ActionExecutionLog(
            action_id=action_id,
            executed_by=ExecutedBy.PATIENT_TAP,
            result=ExecutionResult.SUCCESS,
            cancel_reason=None,
            executed_at=datetime.now(UTC),
        )
    )

    session.status = VoiceSessionStatus.EXECUTED
    await db.flush()


async def cancel_session(
    patient: User,
    session_id: str,
    data: CancelSessionIn,
    db: AsyncSession,
) -> None:
    """Cancel a voice session."""
    session = await db.get(VoiceSession, session_id)
    if not session or session.patient_id != str(patient.id):
        raise ValueError("not_found")

    session.status = VoiceSessionStatus.CANCELLED
    session.ended_at = datetime.now(UTC)
    await db.flush()


async def trigger_red_escalation(
    patient: User,
    session_id: str,
    db: AsyncSession,
) -> EscalationStatusOut:
    """Trigger red-level escalation for a session."""
    session = await db.get(VoiceSession, session_id)
    if not session or session.patient_id != str(patient.id):
        raise ValueError("not_found")

    log = RedEscalationLog(
        session_id=session_id,
        patient_id=str(patient.id),
        trigger_text="[patient-triggered]",
        user_confirmed=True,
        user_cancelled=False,
        timeout_occurred=False,
        family_round1_called=False,
        family_called_targets=[],
        family_answered=False,
        asked_911_confirmation=False,
        called_911=False,
        attempt_notification_sent=False,
    )
    db.add(log)
    await db.flush()
    await db.refresh(log)

    return EscalationStatusOut(
        escalation_id=str(log.id),
        family_round1_called=log.family_round1_called,
        family_answered=log.family_answered,
    )


async def get_escalation_status(
    patient: User,
    session_id: str,
    db: AsyncSession,
) -> EscalationStatusOut:
    """Poll escalation status for a session."""
    from sqlalchemy import select

    result = await db.execute(
        select(RedEscalationLog)
        .where(
            RedEscalationLog.session_id == session_id,
            RedEscalationLog.patient_id == str(patient.id),
        )
        .order_by(RedEscalationLog.created_at.desc())
        .limit(1)
    )
    log = result.scalar_one_or_none()
    if not log:
        raise ValueError("not_found")

    return EscalationStatusOut(
        escalation_id=str(log.id),
        family_round1_called=log.family_round1_called,
        family_answered=log.family_answered,
    )
