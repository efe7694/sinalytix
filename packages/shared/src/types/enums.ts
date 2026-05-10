/**
 * Shared enums — mirrors Python backend enums exactly.
 *
 * IMPORTANT: When adding/changing an enum here, update the
 * corresponding Python enum in services/api/app/models/enums.py
 */

// ── User & Auth ─────────────────────────────────────────

export const UserRole = {
  PATIENT: 'patient',
  CAREGIVER: 'caregiver',
  FAMILY: 'family',
  CLINICIAN: 'clinician',
  ADMIN: 'admin',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING_VERIFICATION: 'pending_verification',
  DELETED: 'deleted',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const AuthMethod = {
  APPLE: 'apple',
  GOOGLE: 'google',
  PHONE_OTP: 'phone_otp',
} as const;
export type AuthMethod = (typeof AuthMethod)[keyof typeof AuthMethod];

// ── Actor Pattern ───────────────────────────────────────

export const ActorType = {
  PATIENT: 'patient',
  CAREGIVER: 'caregiver',
  FAMILY: 'family',
  CLINICIAN: 'clinician',
  SYSTEM: 'system',
  AGENT: 'agent',
} as const;
export type ActorType = (typeof ActorType)[keyof typeof ActorType];

// ── Tasks ────────────────────────────────────────────────

export const TaskType = {
  ONE_TIME: 'one_time',
  RECURRING: 'recurring',
  COUNTER: 'counter',
} as const;
export type TaskType = (typeof TaskType)[keyof typeof TaskType];

export const TaskSubtype = {
  STANDARD: 'standard',
  MEDICATION: 'medication',
} as const;
export type TaskSubtype = (typeof TaskSubtype)[keyof typeof TaskSubtype];

export const TaskOccurrenceStatus = {
  TODO: 'todo',
  DONE: 'done',
  SKIPPED: 'skipped',
} as const;
export type TaskOccurrenceStatus =
  (typeof TaskOccurrenceStatus)[keyof typeof TaskOccurrenceStatus];

// ── Calls ────────────────────────────────────────────────

export const CallType = {
  SOS: 'sos',
  REGULAR: 'regular',
} as const;
export type CallType = (typeof CallType)[keyof typeof CallType];

// ── Messaging ────────────────────────────────────────────

export const ConversationType = {
  INDIVIDUAL: 'individual',
  GROUP: 'group',
} as const;
export type ConversationType = (typeof ConversationType)[keyof typeof ConversationType];

export const MessageSource = {
  MANUAL: 'manual',
  AGENT: 'agent',
} as const;
export type MessageSource = (typeof MessageSource)[keyof typeof MessageSource];

// ── Notifications ────────────────────────────────────────

export const NotificationType = {
  DAILY_REPORT: 'daily_report',
  NEW_MESSAGE: 'new_message',
  TASK_REMINDER: 'task_reminder',
  CAREGIVER_CONNECTED: 'caregiver_connected',
  CAREGIVER_DISCONNECTED: 'caregiver_disconnected',
  EC_VERIFICATION_REMINDER: 'ec_verification_reminder',
  SYMPTOM_REPORT_SENT: 'symptom_report_sent',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

// ── AI Agent Risk ────────────────────────────────────────

export const RiskLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;
export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

export const JudgeCategory = {
  MEDICAL_ADVICE: 'medical_advice',
  IRRELEVANT: 'irrelevant',
  GENERAL_LIFE: 'general_life',
  IN_SCOPE_ACTION: 'in_scope_action',
} as const;
export type JudgeCategory = (typeof JudgeCategory)[keyof typeof JudgeCategory];
