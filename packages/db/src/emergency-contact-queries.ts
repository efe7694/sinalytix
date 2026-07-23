/**
 * Wrappers around the SECURITY DEFINER emergency-contact executors from
 * migration 0017 — see that file's header for why an approved `ec_change`
 * writes through functions rather than an RLS policy (D12's Critical was
 * exactly a family member gaining write access to these rows).
 *
 * Every function authorizes on `patientId`, which callers MUST take from
 * `approval_requests.patient_id` — never from the approver's session and
 * never from the action payload.
 */
import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Database } from './types';

export async function ecNextSortOrder(db: Kysely<Database>, patientId: string): Promise<number | null> {
  const result = await sql<{ ec_next_sort_order: number | null }>`
    select ec_next_sort_order(${patientId}) as ec_next_sort_order
  `.execute(db);
  return result.rows[0]?.ec_next_sort_order ?? null;
}

export async function ecApplyCreate(
  db: Kysely<Database>,
  input: {
    patientId: string;
    relationship: string;
    firstName: string;
    lastName: string;
    phone: string;
    sortOrder: number;
  },
): Promise<string | null> {
  const result = await sql<{ ec_apply_create: string }>`
    select ec_apply_create(
      ${input.patientId}, ${input.relationship}, ${input.firstName},
      ${input.lastName}, ${input.phone}, ${input.sortOrder}
    ) as ec_apply_create
  `.execute(db);
  return result.rows[0]?.ec_apply_create ?? null;
}

export async function ecApplyUpdate(
  db: Kysely<Database>,
  input: {
    ecId: string;
    patientId: string;
    relationship?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  },
): Promise<boolean> {
  const result = await sql<{ ec_apply_update: boolean }>`
    select ec_apply_update(
      ${input.ecId}, ${input.patientId}, ${input.relationship ?? null},
      ${input.firstName ?? null}, ${input.lastName ?? null}, ${input.phone ?? null}
    ) as ec_apply_update
  `.execute(db);
  return result.rows[0]?.ec_apply_update ?? false;
}

export async function ecApplyRemove(db: Kysely<Database>, ecId: string, patientId: string): Promise<boolean> {
  const result = await sql<{ ec_apply_remove: boolean }>`
    select ec_apply_remove(${ecId}, ${patientId}) as ec_apply_remove
  `.execute(db);
  return result.rows[0]?.ec_apply_remove ?? false;
}
