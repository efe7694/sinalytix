"""Sina AI agent request/response schemas."""

from pydantic import BaseModel


class CreateSessionIn(BaseModel):
    trigger_source: str  # ptt | wakeword_in_app | siri_shortcut | assistant_deeplink


class CreateSessionOut(BaseModel):
    session_id: str
    status: str


class ProposedActionOut(BaseModel):
    action_id: str
    session_id: str
    action_type: str
    judge_category: str | None
    risk_level: str  # low | medium | high — maps to green/yellow/red in UI
    is_explicit_emergency: bool
    summary: str
    action_summary: str
    auto_confirm_after_sec: int | None
    payload: dict | None
    tts_text: str | None


class SinaResponse(BaseModel):
    session_id: str
    proposed_action: ProposedActionOut | None
    clarification_questions: list[str]
    blocked_message: str | None
    general_life_response: str | None


class ExecuteActionIn(BaseModel):
    clarifications: dict | None = None  # {q1_answer, q2_answer}


class CancelSessionIn(BaseModel):
    reason: str | None = None


class EscalationStatusOut(BaseModel):
    escalation_id: str
    family_round1_called: bool
    family_answered: bool
