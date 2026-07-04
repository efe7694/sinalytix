/**
 * Canonical enums — mirrors Sinalytix_Canonical_Data_Dictionary__R2.md exactly.
 *
 * Scope: Faz 0 (identity, session, consent-record) only. Later phases add
 * their own enum files here as the corresponding tables are migrated
 * (do not pre-declare enums for tables that don't exist in packages/db yet).
 */

// ── User (Dictionary §1) ────────────────────────────────

export const UserStatus = {
  INCOMPLETE: 'incomplete',
  ACTIVE: 'active',
  SUSPENDED_SOFT: 'suspended_soft',
  SUSPENDED_HARD: 'suspended_hard',
  DORMANT: 'dormant',
  DEACTIVATED: 'deactivated',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const Role = {
  PATIENT: 'patient',
  FAMILY: 'family',
  CAREGIVER: 'caregiver',
  CLINICIAN: 'clinician',
  NURSE: 'nurse',
  COORDINATOR: 'coordinator',
  ADMIN: 'admin',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const AuthMethod = {
  APPLE_SSO: 'apple_sso',
  GOOGLE_SSO: 'google_sso',
  PHONE_OTP: 'phone_otp',
  EMAIL_PASSWORD: 'email_password',
} as const;
export type AuthMethod = (typeof AuthMethod)[keyof typeof AuthMethod];

export const Locale = {
  EN: 'en',
  FR: 'fr',
  TR: 'tr',
} as const;
export type Locale = (typeof Locale)[keyof typeof Locale];

// ── Session / App context (Dictionary §1, Module 2 §1.3) ─

export const AppContext = {
  PATIENT: 'patient',
  FAMILY: 'family',
  CAREGIVER: 'caregiver',
  HCP: 'hcp',
} as const;
export type AppContext = (typeof AppContext)[keyof typeof AppContext];

export const Platform = {
  MOBILE_IOS: 'mobile_ios',
  MOBILE_ANDROID: 'mobile_android',
  WEB: 'web',
} as const;
export type Platform = (typeof Platform)[keyof typeof Platform];

// ── Organization (Dictionary §1) ─────────────────────────

export const OrganizationType = {
  SELF: 'self',
  HOME_CARE_AGENCY: 'home_care_agency',
  CLINIC: 'clinic',
  HOSPITAL: 'hospital',
  COMMUNITY_HEALTH: 'community_health',
  OTHER: 'other',
} as const;
export type OrganizationType = (typeof OrganizationType)[keyof typeof OrganizationType];

// ── CaregiverProfile (Dictionary §1, C22) ────────────────

export const CaregiverRole = {
  PSW: 'psw',
  RPN: 'rpn',
  RN: 'rn',
  HCA: 'hca',
  OTHER: 'other',
} as const;
export type CaregiverRole = (typeof CaregiverRole)[keyof typeof CaregiverRole];

export const AvailabilityStatus = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
  ON_SHIFT: 'on_shift',
} as const;
export type AvailabilityStatus = (typeof AvailabilityStatus)[keyof typeof AvailabilityStatus];

// ── ConsentRecord (Dictionary §2, B9/C10/C16) ────────────

export const RecordedChannel = {
  IN_APP: 'in_app',
  CLINICIAN_RECORDED: 'clinician_recorded',
  PAPER: 'paper',
} as const;
export type RecordedChannel = (typeof RecordedChannel)[keyof typeof RecordedChannel];

/** Keys of `ConsentRecord.flags` (jsonb) — set depends on app_context/role. */
export const ConsentFlag = {
  ACCEPT_TOS: 'accept_tos',
  ACCEPT_PRIVACY: 'accept_privacy',
  ACK_NOT_EMERGENCY: 'ack_not_emergency',
  ACK_NO_CLINICAL_DECISION: 'ack_no_clinical_decision',
  ACK_CLINICAL_RESPONSIBILITY: 'ack_clinical_responsibility',
  ACK_SCOPE_OF_PRACTICE: 'ack_scope_of_practice',
  ACK_PHIPA_ESP: 'ack_phipa_esp',
  ACK_AI_PROCESSING: 'ack_ai_processing',
} as const;
export type ConsentFlag = (typeof ConsentFlag)[keyof typeof ConsentFlag];
