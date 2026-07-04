"""SQLAlchemy ORM models — all tables across the Sinalytix platform.

Import order matters for Alembic autogenerate to discover all models.
"""

from app.models.account import AccountDeletionRequest
from app.models.agent import (
    ActionExecutionLog,
    AIInteractionLog,
    ProposedAction,
    RedEscalationLog,
    SymptomReport,
    VoiceSession,
)
from app.models.base import Base
from app.models.call import CallAttemptLog
from app.models.caregiver import CaregiverLink, CaregiverShift, FamilyAvailability
from app.models.consent import ConsentRecord
from app.models.emergency_contact import EmergencyContact
from app.models.health import HealthProfile, HealthProfileAuditLog, MedicationRecord
from app.models.messaging import (
    Conversation,
    ConversationMember,
    Message,
    MessageReadStatus,
)
from app.models.notification import Notification, PushToken
from app.models.task import (
    ActivityLog,
    DailySummaryLog,
    TaskDefinition,
    TaskOccurrence,
    TaskSchedule,
)
from app.models.user import OAuthAccount, PatientProfile, User

__all__ = [
    "AIInteractionLog",
    "AccountDeletionRequest",
    "ActionExecutionLog",
    "ActivityLog",
    "Base",
    "CallAttemptLog",
    "CaregiverLink",
    "CaregiverShift",
    "ConsentRecord",
    "Conversation",
    "ConversationMember",
    "DailySummaryLog",
    "EmergencyContact",
    "FamilyAvailability",
    "HealthProfile",
    "HealthProfileAuditLog",
    "MedicationRecord",
    "Message",
    "MessageReadStatus",
    "Notification",
    "OAuthAccount",
    "PatientProfile",
    "ProposedAction",
    "PushToken",
    "RedEscalationLog",
    "SymptomReport",
    "TaskDefinition",
    "TaskOccurrence",
    "TaskSchedule",
    "User",
    "VoiceSession",
]
