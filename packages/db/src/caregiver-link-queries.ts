/**
 * Wrappers around the SECURITY DEFINER caregiver-link functions from
 * migration 0013_caregiver-link.js — see that file's header for why the
 * lookup/redeem/unlink writes bypass RLS (anti-enumeration + the Slice 3 C1
 * lesson: cross-actor writes go through scoped functions, not broad policies).
 */
import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Database } from './types';

export interface CaregiverLinkLookup {
  link_id: string;
  patient_id: string;
  expires_at: Date;
}

export async function findCaregiverLinkByCode(
  db: Kysely<Database>,
  code: string,
): Promise<CaregiverLinkLookup | undefined> {
  const result = await sql<CaregiverLinkLookup>`select * from caregiver_link_lookup(${code})`.execute(db);
  return result.rows[0];
}

export async function findCaregiverLinkByQrPayload(
  db: Kysely<Database>,
  qrPayload: string,
): Promise<CaregiverLinkLookup | undefined> {
  const result = await sql<CaregiverLinkLookup>`select * from caregiver_link_lookup_by_qr(${qrPayload})`.execute(db);
  return result.rows[0];
}

export interface CaregiverLinkRedeemResult {
  link_id: string;
  patient_id: string;
}

/** Atomically links one pending, unexpired caregiver code. Returns undefined
 * if it was concurrently redeemed/expired. Args are server-derived. */
export async function redeemCaregiverLink(
  db: Kysely<Database>,
  linkId: string,
  caregiverId: string,
): Promise<CaregiverLinkRedeemResult | undefined> {
  const result = await sql<CaregiverLinkRedeemResult>`select * from caregiver_link_redeem(${linkId}, ${caregiverId})`.execute(db);
  return result.rows[0];
}

/** Unlinks an active caregiver link on behalf of either party. Returns
 * undefined if the actor isn't a party or the link isn't currently linked. */
export async function unlinkCaregiverLink(
  db: Kysely<Database>,
  linkId: string,
  actorId: string,
): Promise<{ link_id: string } | undefined> {
  const result = await sql<{ link_id: string }>`select * from caregiver_link_unlink(${linkId}, ${actorId})`.execute(db);
  return result.rows[0];
}
