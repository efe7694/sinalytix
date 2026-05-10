"""AI Agent models — from AI Agent PRD (Sina).

Voice session pipeline: ASR → LLM-as-judge → action extraction → risk classification.
All sessions logged regardless of outcome — data collection for Phase 2 training.

CRITICAL: ai_interaction_logs is the most important table in Phase 1.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, generate_uuid
from app.models.enums import (
    ActionType,
    CancelReason,
    ExecutedBy,
    ExecutionResult,
    JudgeCategory,
    RiskLevel,
    VoiceSessionStatus,
    VoiceTriggerSource,
)


class VoiceSession(Base):
    """Voice session — one PTT/wakeword activation.

    Every session is logged regardless of outcome.
    Audio retention: 7 days max (if stored), default off.
    """

    __tablename__ = "voice_sessions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    trigger_source: Mapped[VoiceTriggerSource] = mapped_column(
        Enum(VoiceTriggerSource, name="voice_trigger_source"), nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    asr_transcript_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    asr_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    llm_normalized_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    judge_category: Mapped[JudgeCategory | None] = mapped_column(
        Enum(JudgeCategory, name="judge_category"), nullable=True
    )
    status: Mapped[VoiceSessionStatus] = mapped_column(
        Enum(VoiceSessionStatus, name="voice_session_status"),
        nullable=False,
        default=VoiceSessionStatus.PROCESSING,
    )
    audio_uri: Mapped[str | None] = mapped_column(
        String(500), nullable=True, comment="Optional, 7-day retention"
    )


class ProposedAction(Base):
    """Action proposed by Sina — logged whether executed or not."""

    __tablename__ = "proposed_actions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    action_type: Mapped[ActionType] = mapped_column(
        Enum(ActionType, name="action_type"), nullable=False
    )
    risk_level: Mapped[RiskLevel] = mapped_column(
        Enum(RiskLevel, name="risk_level"), nullable=False
    )
    is_explicit_emergency: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    requires_user_confirm: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    auto_confirm_after_sec: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="Green=10, others=null"
    )
    payload: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True, comment="Action-specific data"
    )
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class ActionExecutionLog(Base):
    """IMMUTABLE execution result for every proposed action."""

    __tablename__ = "action_execution_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    action_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    executed_by: Mapped[ExecutedBy] = mapped_column(
        Enum(ExecutedBy, name="executed_by"), nullable=False
    )
    result: Mapped[ExecutionResult] = mapped_column(
        Enum(ExecutionResult, name="execution_result"), nullable=False
    )
    cancel_reason: Mapped[CancelReason | None] = mapped_column(
        Enum(CancelReason, name="cancel_reason"), nullable=True
    )
    error_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    executed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class SymptomReport(Base):
    """Symptom report — sent to family + caregiver.

    Max 2 clarification questions. Questions are neutral (time, severity, context).
    System NEVER evaluates severity or suggests diagnosis.
    """

    __tablename__ = "symptom_reports"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    patient_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    raw_complaint: Mapped[str] = mapped_column(Text, nullable=False, comment="Patient's own words")
    clarification_q1: Mapped[str | None] = mapped_column(String(500), nullable=True)
    clarification_a1: Mapped[str | None] = mapped_column(Text, nullable=True)
    clarification_q2: Mapped[str | None] = mapped_column(String(500), nullable=True)
    clarification_a2: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_to_family: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sent_to_caregiver: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class RedEscalationLog(Base):
    """IMMUTABLE red escalation log — records every red-level event.

    Logged even if user cancels or times out.
    Critical safety audit trail.
    """

    __tablename__ = "red_escalation_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    patient_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    trigger_text: Mapped[str] = mapped_column(
        Text, nullable=False, comment="The utterance that triggered red"
    )
    user_confirmed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, comment="Did user tap 'Call Family'?"
    )
    user_cancelled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    timeout_occurred: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    family_round1_called: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    family_called_targets: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, default=list
    )
    family_answered: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    asked_911_confirmation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    called_911: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    attempt_notification_sent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class AIInteractionLog(Base):
    """CRITICAL: Phase 1 data collection for future fine-tuning.

    This is the most important table in Phase 1.
    Every model input, output, and user correction is logged here.
    This data becomes the training set for Phase 2 LoRA fine-tuning.

    IMMUTABLE — append-only, no updates, no deletes.
    """

    __tablename__ = "ai_interaction_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    model_version: Mapped[str] = mapped_column(
        String(100), nullable=False, comment='e.g. "medgemma-27b-base"'
    )
    input_text: Mapped[str] = mapped_column(Text, nullable=False)
    output_text: Mapped[str] = mapped_column(Text, nullable=False)
    output_structured: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True, comment="Parsed model output"
    )
    user_correction: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True, comment="If user modified AI output, what changed?"
    )
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    context: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True, comment='{"patient_id", "care_plan_id", "task_type"}'
    )
    flagged_for_review: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
