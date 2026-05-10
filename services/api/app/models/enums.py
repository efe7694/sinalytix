"""Enum definitions shared across the entire Sinalytix platform.

These enums are used by all 4 apps + admin panel.
Changes here affect every application in the ecosystem.
"""

import enum

# ── User & Auth ──────────────────────────────────────────


class UserRole(enum.StrEnum):
    """User role — determines which app they use."""

    PATIENT = "patient"
    CAREGIVER = "caregiver"
    FAMILY = "family"
    CLINICIAN = "clinician"
    ADMIN = "admin"


class UserStatus(enum.StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING_VERIFICATION = "pending_verification"
    DELETED = "deleted"


class AuthMethod(enum.StrEnum):
    APPLE = "apple"
    GOOGLE = "google"
    PHONE_OTP = "phone_otp"


# ── Actor Pattern ────────────────────────────────────────
# Used across tasks, messages, activity logs, etc.


class ActorType(enum.StrEnum):
    PATIENT = "patient"
    CAREGIVER = "caregiver"
    FAMILY = "family"
    CLINICIAN = "clinician"
    SYSTEM = "system"
    AGENT = "agent"


# ── Health Profile ───────────────────────────────────────


class ConditionCode(enum.StrEnum):
    """Health condition catalog from Onboarding PRD."""

    DEMENTIA = "dementia"
    ALZHEIMER = "alzheimer"
    PARKINSON = "parkinson"
    MS = "ms"
    STROKE = "stroke"
    CHF = "chf"
    CAD = "cad"
    HYPERTENSION = "hypertension"
    DIABETES_T1 = "diabetes_t1"
    DIABETES_T2 = "diabetes_t2"
    COPD_ASTHMA = "copd_asthma"
    CKD = "ckd"
    CANCER_ONCOLOGY = "cancer_oncology"
    ORTHO_POSTOP = "ortho_postop"
    PALLIATIVE = "palliative"
    OTHER = "other"
    UNKNOWN = "unknown"


class AllergyCode(enum.StrEnum):
    """Allergy catalog."""

    DRUG = "drug"
    FOOD = "food"
    ENVIRONMENTAL = "environmental"
    OTHER = "other"
    NONE = "none"
    UNKNOWN = "unknown"


class AllergyFlag(enum.StrEnum):
    YES = "yes"
    NO = "no"
    UNKNOWN = "unknown"


class DeclaredConfidence(enum.StrEnum):
    PROFESSIONALLY_DIAGNOSED = "professionally_diagnosed"
    SELF_DECLARED = "self_declared"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class MedicationStatus(enum.StrEnum):
    ACTIVE = "active"
    DISCONTINUED = "discontinued"
    ARCHIVED = "archived"


class DataSource(enum.StrEnum):
    MANUAL = "manual"
    OCR_EXTRACTED = "ocr_extracted"
    INTEGRATED_PORTAL = "integrated_portal"
    CAREGIVER = "caregiver"
    FAMILY = "family"
    SYSTEM = "system"
    AGENT = "agent"


class HealthProfileField(enum.StrEnum):
    """Fields tracked in HealthProfileAuditLog."""

    CONDITIONS = "conditions"
    ALLERGIES = "allergies"
    MEDICATION_ADDED = "medication_added"
    MEDICATION_REMOVED = "medication_removed"
    MEDICATION_UPDATED = "medication_updated"


# ── Emergency Contact ────────────────────────────────────


class ECRelationship(enum.StrEnum):
    SPOUSE = "spouse"
    CHILD = "child"
    SIBLING = "sibling"
    FRIEND = "friend"
    OTHER = "other"


class ECInviteStatus(enum.StrEnum):
    PENDING = "pending"
    ACCEPTED_APP_USER = "accepted_app_user"
    ACCEPTED_PHONE_ONLY = "accepted_phone_only"


# ── Caregiver Link ───────────────────────────────────────


class CaregiverLinkStatus(enum.StrEnum):
    PENDING = "pending"
    LINKED = "linked"
    EXPIRED = "expired"
    UNLINKED = "unlinked"


# ── Caregiver Profile ────────────────────────────────────


class CaregiverRole(enum.StrEnum):
    """Ontario regulated / support worker roles."""

    PSW = "psw"
    HCA = "hca"
    RPN = "rpn"
    RN = "rn"
    OTHER = "other"


class CaregiverProfileStatus(enum.StrEnum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DEACTIVATED = "deactivated"


# ── Shift Management ─────────────────────────────────────


class CheckOutReason(enum.StrEnum):
    MANUAL = "manual"
    AUTO_SWITCH = "auto_switch"
    SYSTEM_TIMEOUT = "system_timeout"


# ── Caregiver Notifications ──────────────────────────────


class CaregiverNotificationType(enum.StrEnum):
    SHIFT_ASSIGNED = "shift_assigned"
    SHIFT_CANCELLED = "shift_cancelled"
    SHIFT_CHANGED = "shift_changed"
    SHIFT_REMINDER_2H = "shift_reminder_2h"
    SHIFT_REMINDER_30M = "shift_reminder_30m"
    SHIFT_CHECKIN_LATE = "shift_checkin_late"
    SHIFT_CHECKOUT_REMINDER = "shift_checkout_reminder"
    SHIFT_24H_ALERT = "shift_24h_alert"
    TASK_ASSIGNED = "task_assigned"
    TASK_DUE_SOON = "task_due_soon"
    TASK_OVERDUE = "task_overdue"
    TASK_CHANGED = "task_changed"
    TASK_CANCELLED = "task_cancelled"
    NEW_DIRECT_MESSAGE = "new_direct_message"
    URGENT_MESSAGE = "urgent_message"
    GROUP_MESSAGE = "group_message"
    BROADCAST_MESSAGE = "broadcast_message"
    CARE_PLAN_UPDATED = "care_plan_updated"
    NEW_CARE_INSTRUCTION = "new_care_instruction"
    MEDICATION_CHANGED = "medication_changed"
    PATIENT_LINKED = "patient_linked"
    PATIENT_UNLINKED = "patient_unlinked"


class CaregiverNotificationPriority(enum.StrEnum):
    CRITICAL = "critical"
    IMPORTANT = "important"
    INFORMATIONAL = "informational"
    PASSIVE = "passive"


# ── Caregiver Messaging ──────────────────────────────────


class CaregiverConversationType(enum.StrEnum):
    DIRECT = "direct"
    GROUP = "group"
    BROADCAST = "broadcast"
    SYSTEM_EVENT = "system_event"


class CaregiverMessageType(enum.StrEnum):
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    SYSTEM_EVENT = "system_event"


# ── Caregiver AI Interaction ─────────────────────────────


class CaregiverAIInteractionType(enum.StrEnum):
    SHIFT_BRIEFING = "shift_briefing"
    CARE_PLAN_QA = "care_plan_qa"
    VOICE_NOTE = "voice_note"
    ESCALATION_LOOKUP = "escalation_lookup"
    TASK_PRIORITY = "task_priority"


# ── Tasks ────────────────────────────────────────────────


class TaskType(enum.StrEnum):
    ONE_TIME = "one_time"
    RECURRING = "recurring"
    COUNTER = "counter"


class TaskSubtype(enum.StrEnum):
    STANDARD = "standard"
    MEDICATION = "medication"


class TaskDefinitionStatus(enum.StrEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class TaskOccurrenceStatus(enum.StrEnum):
    TODO = "todo"
    DONE = "done"
    SKIPPED = "skipped"


class RecurrenceFrequency(enum.StrEnum):
    DAILY = "daily"
    WEEKLY = "weekly"


class DayOfWeek(enum.StrEnum):
    MON = "MON"
    TUE = "TUE"
    WED = "WED"
    THU = "THU"
    FRI = "FRI"
    SAT = "SAT"
    SUN = "SUN"


class SkipReason(enum.StrEnum):
    MANUAL = "manual"


class SourceProvenance(enum.StrEnum):
    MANUAL = "manual"
    CAREGIVER = "caregiver"
    FAMILY = "family"
    INTEGRATED = "integrated"
    AGENT = "agent"


# ── Activity Log ─────────────────────────────────────────


class ActivityAction(enum.StrEnum):
    CREATED = "created"
    EDITED = "edited"
    DELETED = "deleted"
    COMPLETED = "completed"
    UNDONE = "undone"
    SKIPPED = "skipped"
    UNSKIPPED = "unskipped"


# ── Calls ────────────────────────────────────────────────


class CallType(enum.StrEnum):
    SOS = "sos"
    REGULAR = "regular"


class CallTargetType(enum.StrEnum):
    FAMILY = "family"
    CAREGIVER = "caregiver"
    EMERGENCY_SERVICES = "emergency_services"


class CallStatus(enum.StrEnum):
    INITIATED = "initiated"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class CallCancelStage(enum.StrEnum):
    PRE_FAMILY_10S = "pre_family_10s"
    PRE_911_30S = "pre_911_30s"
    REGULAR_MODAL_TIMEOUT = "regular_modal_timeout"
    REGULAR_USER_CANCELLED = "regular_user_cancelled"


# ── Messaging ────────────────────────────────────────────


class ConversationType(enum.StrEnum):
    INDIVIDUAL = "individual"
    GROUP = "group"


class MessageSource(enum.StrEnum):
    MANUAL = "manual"
    AGENT = "agent"


# ── Notifications ────────────────────────────────────────


class NotificationType(enum.StrEnum):
    DAILY_REPORT = "daily_report"
    NEW_MESSAGE = "new_message"
    TASK_REMINDER = "task_reminder"
    CAREGIVER_CONNECTED = "caregiver_connected"
    CAREGIVER_DISCONNECTED = "caregiver_disconnected"
    EC_VERIFICATION_REMINDER = "ec_verification_reminder"
    SYMPTOM_REPORT_SENT = "symptom_report_sent"


class NotificationRedirectTarget(enum.StrEnum):
    TASK_LIST = "task_list"
    INBOX = "inbox"
    SETTINGS_PRIVACY = "settings_privacy"


# ── AI Agent ─────────────────────────────────────────────


class VoiceTriggerSource(enum.StrEnum):
    PTT = "ptt"
    WAKEWORD_IN_APP = "wakeword_in_app"
    SIRI_SHORTCUT = "siri_shortcut"
    ASSISTANT_DEEPLINK = "assistant_deeplink"


class JudgeCategory(enum.StrEnum):
    MEDICAL_ADVICE = "medical_advice"
    IRRELEVANT = "irrelevant"
    GENERAL_LIFE = "general_life"
    IN_SCOPE_ACTION = "in_scope_action"


class VoiceSessionStatus(enum.StrEnum):
    PROCESSING = "processing"
    AWAITING_USER = "awaiting_user"
    EXECUTED = "executed"
    CANCELLED = "cancelled"
    FAILED = "failed"


class ActionType(enum.StrEnum):
    TASK_COMPLETE = "TASK_COMPLETE"
    TASK_COUNTER_INCREMENT = "TASK_COUNTER_INCREMENT"
    MESSAGE_SEND = "MESSAGE_SEND"
    CALL_TRIGGER_REGULAR = "CALL_TRIGGER_REGULAR"
    CALL_TRIGGER_SOS = "CALL_TRIGGER_SOS"
    SYMPTOM_REPORT_SEND = "SYMPTOM_REPORT_SEND"


class RiskLevel(enum.StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ExecutedBy(enum.StrEnum):
    PATIENT_TAP = "patient_tap"
    PATIENT_VOICE_CONFIRM = "patient_voice_confirm"
    AUTO_CONFIRM = "auto_confirm"
    SYSTEM = "system"


class ExecutionResult(enum.StrEnum):
    SUCCESS = "success"
    CANCELLED = "cancelled"
    FAILED = "failed"


class CancelReason(enum.StrEnum):
    USER_CANCELLED = "user_cancelled"
    TIMEOUT = "timeout"
    PIPELINE_ERROR = "pipeline_error"


# ── Account Management ───────────────────────────────────


class AccountDeletionStatus(enum.StrEnum):
    PENDING = "pending"
    CANCELLED = "cancelled"
    EXECUTED = "executed"
