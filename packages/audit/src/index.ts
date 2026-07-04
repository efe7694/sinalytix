/**
 * AuditWriter — Module 1 §8.1, Module 3 §2.3.
 * Call inside the same DB transaction as the domain write it documents: if
 * the log insert fails, the transaction (and the action) rolls back
 * (Module 4 §9.4 fail-closed principle, applied to every audited action).
 */
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';

export type AuditEventCategory =
  | 'auth'
  | 'session'
  | 'clinical'
  | 'consent'
  | 'admin'
  | 'security'
  | 'integration'
  | 'ingestion';

export type AuditEventSeverity = 'info' | 'warning' | 'critical';

export interface AuditEventInput {
  eventType: string;
  eventCategory: AuditEventCategory;
  eventSeverity: AuditEventSeverity;
  userId?: string;
  actingUserId?: string;
  actingOrgId?: string;
  actingPractitionerRoleId?: string;
  resourceType?: string;
  resourceId?: string;
  sessionId?: string;
  deviceFpHash?: string;
  ipHash?: string;
  uaHash?: string;
  eventData?: Record<string, unknown>;
}

export async function writeAuditLog(trx: Kysely<Database>, event: AuditEventInput): Promise<void> {
  await trx
    .insertInto('audit_log_entries')
    .values({
      event_type: event.eventType,
      event_category: event.eventCategory,
      event_severity: event.eventSeverity,
      user_id: event.userId ?? null,
      acting_user_id: event.actingUserId ?? null,
      acting_org_id: event.actingOrgId ?? null,
      acting_practitioner_role_id: event.actingPractitionerRoleId ?? null,
      resource_type: event.resourceType ?? null,
      resource_id: event.resourceId ?? null,
      session_id: event.sessionId ?? null,
      device_fp_hash: event.deviceFpHash ?? null,
      ip_hash: event.ipHash ?? null,
      ua_hash: event.uaHash ?? null,
      event_data: JSON.stringify(event.eventData ?? {}),
    })
    .execute();
}
