/**
 * Wrappers around the SECURITY DEFINER family-link-code lookup functions
 * from migration 0011_family-link-code.js — see that file's header comment
 * for why these exist instead of a blanket RLS bypass.
 */
import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Database } from './types';

export interface FamilyLinkCodeLookup {
  link_code_id: string;
  patient_id: string;
  source: string;
  emergency_contact_id: string | null;
  expires_at: Date;
}

export async function findFamilyLinkCodeByCode(
  db: Kysely<Database>,
  code: string,
): Promise<FamilyLinkCodeLookup | undefined> {
  const result = await sql<FamilyLinkCodeLookup>`select * from family_link_code_lookup(${code})`.execute(db);
  return result.rows[0];
}

export async function findFamilyLinkCodeByQrPayload(
  db: Kysely<Database>,
  qrPayload: string,
): Promise<FamilyLinkCodeLookup | undefined> {
  const result = await sql<FamilyLinkCodeLookup>`select * from family_link_code_lookup_by_qr(${qrPayload})`.execute(
    db,
  );
  return result.rows[0];
}

export interface FamilyLinkCodeRedeemResult {
  link_code_id: string;
  patient_id: string;
  source: string;
  emergency_contact_id: string | null;
  ec_relationship: string | null;
}

/** Atomically marks one active, unexpired code redeemed — see
 * 0011_family-link-code.js's header comment for why this is a SECURITY
 * DEFINER write, not an RLS-governed UPDATE. Returns undefined if the row
 * was concurrently redeemed/revoked/expired since the caller's lookup. */
export async function redeemFamilyLinkCode(
  db: Kysely<Database>,
  linkCodeId: string,
  redeemedBy: string,
  source: string,
): Promise<FamilyLinkCodeRedeemResult | undefined> {
  const result = await sql<FamilyLinkCodeRedeemResult>`select * from family_link_code_redeem(${linkCodeId}, ${redeemedBy}, ${source})`.execute(
    db,
  );
  return result.rows[0];
}
