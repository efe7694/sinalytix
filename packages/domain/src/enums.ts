/**
 * Canonical enums — mirrors Sinalytix_Canonical_Data_Dictionary__R2.md exactly.
 *
 * Scope: Faz 0 (identity, session, consent-record) + Faz 1 (consent grant,
 * link fabric) so far. Later phases add their own enum files here as the
 * corresponding tables are migrated (do not pre-declare enums for tables
 * that don't exist in packages/db yet).
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

// ── ConsentGrant (Dictionary §2/§4.2, B2/B5/C13/C16) ─────

/** Non-lockbox scope categories. `genetic` is V2 (sensitive, non-lockbox) —
 * excluded until that phase. `ai_processing` is the runtime AI-consent
 * mirror (C16 — there is no separate `ai_consent_record` table). */
export const ConsentCategory = {
  MEDICATIONS: 'medications',
  LABS: 'labs',
  IMAGING: 'imaging',
  DEMOGRAPHIC: 'demographic',
  AI_PROCESSING: 'ai_processing',
} as const;
export type ConsentCategory = (typeof ConsentCategory)[keyof typeof ConsentCategory];

/** Lockbox categories (B5) — default-hidden, each needs its own explicit
 * grant, never inherited from a baseline grant. Mirrors
 * @sinalytix/policy-engine's LOCKBOX_CATEGORIES; kept as a separate domain
 * enum (not imported from policy-engine) since that package is intentionally
 * dependency-free and this one is the wire-contract source of truth. */
export const LockboxCategory = {
  MENTAL_HEALTH: 'mental_health',
  HIV_STI: 'hiv_sti',
  GENDER_IDENTITY: 'gender_identity',
  SUBSTANCE_USE: 'substance_use',
} as const;
export type LockboxCategory = (typeof LockboxCategory)[keyof typeof LockboxCategory];

export const GrantedToKind = {
  PRACTITIONER_ROLE: 'practitioner_role',
  ORG: 'org',
  FAMILY_MEMBER: 'family_member',
  CAREGIVER: 'caregiver',
  SYSTEM: 'system',
} as const;
export type GrantedToKind = (typeof GrantedToKind)[keyof typeof GrantedToKind];

export const Permission = {
  PERMIT: 'permit',
  DENY: 'deny',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

// ── PatientFamilyLink / CaregiverLink (Dictionary §4, C13/C22) ──

export const LinkPermissionLevel = {
  VIEW: 'view',
  EDIT: 'edit',
  FULL: 'full',
} as const;
export type LinkPermissionLevel = (typeof LinkPermissionLevel)[keyof typeof LinkPermissionLevel];

/** `PatientFamilyLink.status`. `CaregiverLink` has its own distinct status
 * set (`CaregiverLinkStatus` below) — a caregiver link has no
 * patient-confirm step, so its lifecycle is pending→linked, not
 * pending_patient_confirm→active. */
export const FamilyLinkStatus = {
  PENDING_PATIENT_CONFIRM: 'pending_patient_confirm',
  ACTIVE: 'active',
  REVOKED: 'revoked',
} as const;
export type FamilyLinkStatus = (typeof FamilyLinkStatus)[keyof typeof FamilyLinkStatus];

/** `CaregiverLink.status` (Faz 1 Slice 4, Dictionary §4/C22) — the code and
 * the link are the same row: a `pending` code becomes `linked` on redeem;
 * `unlinked` when either party ends it; `expired` once its 15-min TTL lapses. */
export const CaregiverLinkStatus = {
  PENDING: 'pending',
  LINKED: 'linked',
  EXPIRED: 'expired',
  UNLINKED: 'unlinked',
} as const;
export type CaregiverLinkStatus = (typeof CaregiverLinkStatus)[keyof typeof CaregiverLinkStatus];

// ── ApprovalRequest / PatientApprovalConfig (Faz 1 Slice 5, Module 3) ─────

/** The sensitive actions a patient can require family approval for. Kept to
 * exactly two in Faz 1 (a judgment call — see DEVIATIONS D14). */
export const ApprovalActionType = {
  CAREGIVER_LINK_CHANGE: 'caregiver_link_change',
  FAMILY_LINK_PERMISSION_CHANGE: 'family_link_permission_change',
} as const;
export type ApprovalActionType = (typeof ApprovalActionType)[keyof typeof ApprovalActionType];

export const ApprovalStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  // No eligible approver existed at request time, so it executed immediately.
  AUTO_APPROVED_NO_APPROVER: 'auto_approved_no_approver',
} as const;
export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export const RequestedByRole = {
  PATIENT: 'patient',
  FAMILY: 'family',
  CAREGIVER: 'caregiver',
} as const;
export type RequestedByRole = (typeof RequestedByRole)[keyof typeof RequestedByRole];

export const FamilyLinkSource = {
  EC_INVITE: 'ec_invite',
  CODE: 'code',
  QR: 'qr',
} as const;
export type FamilyLinkSource = (typeof FamilyLinkSource)[keyof typeof FamilyLinkSource];
