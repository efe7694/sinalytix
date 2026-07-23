/**
 * Kysely `Database` interface — one entry per Faz 0 table, columns matching
 * the migrations in packages/db/migrations verbatim. Extended as later
 * phases' migrations land; do not add rows for tables that don't exist yet.
 */
import type { ColumnType, Generated } from 'kysely';

// A single ColumnType (not `Generated<Timestamp>`, which double-wraps and
// loses the `Date` select type) for timestamptz columns with a DB default
// (created_at-style); required-input timestamps use `Timestamp` directly.
type Timestamp = ColumnType<Date, Date | string, Date | string>;
type GeneratedTimestamp = ColumnType<Date, Date | string | undefined, Date | string>;
// text[] columns with a `DEFAULT '{}'` — optional on insert, same reasoning.
type GeneratedStringArray = ColumnType<string[], string[] | undefined, string[]>;

export interface UsersTable {
  user_id: Generated<string>;
  email: string | null;
  email_verified: ColumnType<boolean, boolean | undefined, boolean>;
  phone_e164: string | null;
  phone_verified: ColumnType<boolean, boolean | undefined, boolean>;
  auth_methods: GeneratedStringArray;
  password_hash: string | null;
  locale: ColumnType<string, string | undefined, string>;
  status: ColumnType<string, string | undefined, string>;
  roles: GeneratedStringArray;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
  deleted_at: Timestamp | null;
}

export interface OrganizationsTable {
  org_id: Generated<string>;
  type: string;
  name: string;
  invisible_to_users: ColumnType<boolean, boolean | undefined, boolean>;
  parent_org_id: string | null;
  created_at: GeneratedTimestamp;
}

export interface PractitionerRolesTable {
  practitioner_role_id: Generated<string>;
  user_id: string;
  org_id: string;
  discipline_code: string;
  specialty: GeneratedStringArray;
  province_code: string;
  license_record_id: string | null;
  active: ColumnType<boolean, boolean | undefined, boolean>;
  period_start: Timestamp | null;
  period_end: Timestamp | null;
  created_at: GeneratedTimestamp;
}

export interface PatientProfilesTable {
  user_id: string;
  identifier_set: unknown;
  date_of_birth: string | null;
  conditions_declared: GeneratedStringArray;
  allergies_declared: GeneratedStringArray;
  declared_confidence: string | null;
  dnr_status: string | null;
  sensitive_categories_present: GeneratedStringArray;
  org_id_primary: string | null;
  timezone_iana: ColumnType<string, string | undefined, string>;
  preferences: unknown;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

export interface FamilyProfilesTable {
  user_id: string;
  dnd: ColumnType<boolean, boolean | undefined, boolean>;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

export interface CaregiverProfilesTable {
  user_id: string;
  agency_id: string | null;
  employee_id: string | null;
  role: string;
  availability_status: ColumnType<string, string | undefined, string>;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

export interface AdminUsersTable {
  user_id: string;
  /** K10: multi-valued. Was a single `text` until migration 0015. */
  admin_role: string[];
  created_at: GeneratedTimestamp;
}

/** K10 / Admin Panel PRD §6 (migration 0015). `value` is jsonb — the typed
 * key registry lives in `@sinalytix/config`, not here. */
export interface SystemConfigTable {
  key: string;
  value: unknown;
  value_schema: ColumnType<unknown, unknown | undefined, unknown>;
  requires_second_approval: ColumnType<boolean, boolean | undefined, boolean>;
  updated_by: string | null;
  updated_at: GeneratedTimestamp;
}

/** K10 / Admin Panel PRD §6 (migration 0015). */
export interface FeatureFlagsTable {
  key: string;
  enabled: ColumnType<boolean, boolean | undefined, boolean>;
  scope: ColumnType<string, string | undefined, string>;
  scope_value: string | null;
  app_context: GeneratedStringArray;
  updated_by: string | null;
  updated_at: GeneratedTimestamp;
}

export interface SessionsTable {
  session_id: Generated<string>;
  user_id: string;
  app_context: string;
  platform: string;
  device_label: string | null;
  max_at: Timestamp;
  idle_at: Timestamp;
  device_fp_hash: string | null;
  ip_hash: string | null;
  ua_hash: string | null;
  country_code: string | null;
  revoked_at: Timestamp | null;
  revoke_reason: string | null;
  created_at: GeneratedTimestamp;
}

export interface RefreshTokensTable {
  refresh_token_id: Generated<string>;
  session_id: string;
  token_hash: string;
  used_at: Timestamp | null;
  rotated_to_token_id: string | null;
  revoked_at: Timestamp | null;
  created_at: GeneratedTimestamp;
}

export interface TotpSecretsTable {
  user_id: string;
  secret_encrypted: string;
  confirmed_at: Timestamp | null;
  created_at: GeneratedTimestamp;
}

export interface BackupCodesTable {
  backup_code_id: Generated<string>;
  user_id: string;
  code_hash: string;
  used_at: Timestamp | null;
  created_at: GeneratedTimestamp;
}

export interface RecoveryTokensTable {
  recovery_token_id: Generated<string>;
  user_id: string;
  token_hash: string;
  purpose: string;
  expires_at: Timestamp;
  used_at: Timestamp | null;
  created_at: GeneratedTimestamp;
}

export interface DeviceFingerprintsTable {
  device_fingerprint_id: Generated<string>;
  user_id: string;
  fingerprint_hash: string;
  trusted: ColumnType<boolean, boolean | undefined, boolean>;
  device_label: string | null;
  created_at: GeneratedTimestamp;
}

export interface LoginAttemptsTable {
  login_attempt_id: Generated<string>;
  user_id: string | null;
  identifier_hash: string;
  ip_hash: string | null;
  ua_hash: string | null;
  success: boolean;
  attempted_at: GeneratedTimestamp;
}

export interface IpBlocksTable {
  ip_block_id: Generated<string>;
  ip_hash: string;
  reason: string;
  blocked_at: GeneratedTimestamp;
  expires_at: Timestamp | null;
}

export interface ConsentRecordsTable {
  consent_id: Generated<string>;
  user_id: string;
  app_context: string;
  version: string;
  recorded_channel: string;
  flags: unknown;
  consented_at: Timestamp;
  server_recorded_at: GeneratedTimestamp;
  ip_hash: string | null;
}

export interface AuditLogEntriesTable {
  audit_log_id: Generated<string>;
  event_type: string;
  event_category: string;
  event_severity: string;
  user_id: string | null;
  acting_user_id: string | null;
  acting_practitioner_role_id: string | null;
  acting_org_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  session_id: string | null;
  device_fp_hash: string | null;
  ip_hash: string | null;
  ua_hash: string | null;
  event_data: unknown;
  acted_at: GeneratedTimestamp;
  inserted_at: GeneratedTimestamp;
  batch_hmac: string | null;
  archived_at: Timestamp | null;
}

export interface PolicyDecisionsTable {
  policy_decision_id: Generated<string>;
  subject_practitioner_role_id: string | null;
  actor_user_id: string | null;
  action: string;
  resource: string;
  context_snapshot: unknown;
  decision: string;
  reasons: GeneratedStringArray;
  obligations: unknown;
  policy_engine_version: string;
  created_at: GeneratedTimestamp;
}

export interface OauthIdentitiesTable {
  oauth_identity_id: Generated<string>;
  user_id: string;
  provider: string;
  provider_subject: string;
  created_at: GeneratedTimestamp;
}

export interface SdmDeclarationsTable {
  sdm_declaration_id: Generated<string>;
  patient_id: string;
  sdm_user_id: string;
  province_rule: ColumnType<string, string | undefined, string>;
  poa_document_id: string | null;
  active: ColumnType<boolean, boolean | undefined, boolean>;
  activated_by: string | null;
  created_at: GeneratedTimestamp;
}

export interface ConsentGrantsTable {
  grant_id: Generated<string>;
  patient_id: string;
  granted_to_kind: string;
  granted_to_id: string;
  scope: unknown;
  permission: string;
  period_start: Timestamp | null;
  period_end: Timestamp | null;
  granted_by: string;
  revoked_at: Timestamp | null;
  revoked_by: string | null;
  created_at: GeneratedTimestamp;
}

export interface EmergencyContactsTable {
  ec_id: Generated<string>;
  patient_id: string;
  relationship: string;
  first_name: string;
  last_name: string;
  phone: string;
  phone_verified: ColumnType<boolean, boolean | undefined, boolean>;
  // Nullable so soft-delete can null it out, freeing the slot for the
  // DEFERRABLE unique constraint without a partial WHERE (see migration
  // 0010's comment) — always non-null on any row a caller reads back
  // through the deleted_at IS NULL filter every query in this service uses.
  sort_order: number | null;
  invite_status: ColumnType<string, string | undefined, string>;
  invite_sent_at: Timestamp | null;
  invite_accepted_at: Timestamp | null;
  linked_family_user_id: string | null;
  created_at: GeneratedTimestamp;
  deleted_at: Timestamp | null;
}

export interface FamilyLinkCodesTable {
  link_code_id: Generated<string>;
  patient_id: string;
  code: string;
  qr_payload: string;
  source: string;
  emergency_contact_id: string | null;
  status: ColumnType<string, string | undefined, string>;
  expires_at: Timestamp;
  redeemed_at: Timestamp | null;
  redeemed_by: string | null;
  created_at: GeneratedTimestamp;
}

export interface PatientFamilyLinksTable {
  link_id: Generated<string>;
  patient_id: string;
  family_user_id: string;
  relationship: string;
  status: string;
  permission_level: ColumnType<string, string | undefined, string>;
  source: string;
  emergency_contact_id: string | null;
  baseline_grant_id: string | null;
  linked_at: Timestamp | null;
  revoked_at: Timestamp | null;
  revoked_by: string | null;
  created_at: GeneratedTimestamp;
}

export interface CaregiverLinksTable {
  link_id: Generated<string>;
  patient_id: string;
  caregiver_id: string | null;
  code: string;
  qr_payload: string;
  status: ColumnType<string, string | undefined, string>;
  expires_at: Timestamp;
  linked_at: Timestamp | null;
  unlinked_at: Timestamp | null;
  unlinked_by: string | null;
  created_at: GeneratedTimestamp;
}

export interface PatientApprovalConfigsTable {
  patient_id: string;
  action_type: string;
  requires_approval: ColumnType<boolean, boolean | undefined, boolean>;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

export interface ApprovalRequestsTable {
  approval_id: Generated<string>;
  patient_id: string;
  action_type: string;
  action_payload: unknown;
  requested_by: string;
  requested_by_role: string;
  requested_by_name: string;
  status: ColumnType<string, string | undefined, string>;
  decided_by: string | null;
  decided_at: Timestamp | null;
  expires_at: Timestamp;
  created_at: GeneratedTimestamp;
}


// ── Care & Tasks (migration 0020, Faz 2 Slice 1) ─────────────────────────

export interface CareTasksTable {
  task_id: Generated<string>;
  patient_id: string;
  parent_task_id: string | null;
  care_plan_id: string | null;
  goal_id: string | null;
  title: string;
  type: string;
  subtype: ColumnType<string, string | undefined, string>;
  schedule: ColumnType<unknown, unknown | undefined, unknown>;
  created_by: string;
  created_by_actor_type: string;
  source_provenance: ColumnType<string, string | undefined, string>;
  status: ColumnType<string, string | undefined, string>;
  /** Bumped by a trigger on every UPDATE — never set it by hand. */
  version: ColumnType<number, number | undefined, number>;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
  deleted_at: Timestamp | null;
}

export interface CareTaskOccurrencesTable {
  occurrence_id: Generated<string>;
  task_id: string;
  patient_id: string;
  /** `YYYY-MM-DD` in the PATIENT's timezone — a calendar date, not an instant. */
  date_local: ColumnType<string, string, string>;
  time_local: string | null;
  status: ColumnType<string, string | undefined, string>;
  progress_count: number | null;
  completed_at: Timestamp | null;
  completed_by: string | null;
  completed_by_actor_type: string | null;
  skipped_at: Timestamp | null;
  skipped_by: string | null;
  carry_over_from: string | null;
  created_at: GeneratedTimestamp;
  last_updated_at: GeneratedTimestamp;
}

export interface ActivityLogTable {
  event_id: Generated<string>;
  patient_id: string;
  entity_type: string;
  entity_id: string;
  task_id: string | null;
  occurrence_id: string | null;
  action: string;
  actor_type: string;
  actor_id: string | null;
  diff: ColumnType<unknown, unknown | undefined, unknown>;
  created_at: GeneratedTimestamp;
}

export interface Database {
  users: UsersTable;
  oauth_identities: OauthIdentitiesTable;
  organizations: OrganizationsTable;
  practitioner_roles: PractitionerRolesTable;
  patient_profiles: PatientProfilesTable;
  family_profiles: FamilyProfilesTable;
  caregiver_profiles: CaregiverProfilesTable;
  admin_users: AdminUsersTable;
  sessions: SessionsTable;
  refresh_tokens: RefreshTokensTable;
  totp_secrets: TotpSecretsTable;
  backup_codes: BackupCodesTable;
  recovery_tokens: RecoveryTokensTable;
  device_fingerprints: DeviceFingerprintsTable;
  login_attempts: LoginAttemptsTable;
  ip_blocks: IpBlocksTable;
  consent_records: ConsentRecordsTable;
  audit_log_entries: AuditLogEntriesTable;
  policy_decisions: PolicyDecisionsTable;
  sdm_declarations: SdmDeclarationsTable;
  consent_grants: ConsentGrantsTable;
  emergency_contacts: EmergencyContactsTable;
  family_link_codes: FamilyLinkCodesTable;
  patient_family_links: PatientFamilyLinksTable;
  caregiver_links: CaregiverLinksTable;
  patient_approval_configs: PatientApprovalConfigsTable;
  approval_requests: ApprovalRequestsTable;
  care_tasks: CareTasksTable;
  care_task_occurrences: CareTaskOccurrencesTable;
  activity_log: ActivityLogTable;
  system_config: SystemConfigTable;
  feature_flags: FeatureFlagsTable;
}
