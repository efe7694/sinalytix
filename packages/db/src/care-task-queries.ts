/**
 * Wrappers around the SECURITY DEFINER care-task functions (migration 0020).
 * Cross-actor writes go through functions, never broad RLS UPDATE policies —
 * the D12/D13/D14 lesson.
 *
 * Each returns the function's outcome string rather than throwing, so the
 * service can map it to a precise status code (404 vs 403 vs 409) instead of
 * guessing from a generic failure.
 */
import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Database } from './types';

/** The actor's role for this patient, or null if unrelated. */
export async function careActorRole(
  db: Kysely<Database>,
  patientId: string,
  actorId: string,
): Promise<string | null> {
  const r = await sql<{ care_actor_role: string | null }>`
    select care_actor_role(${patientId}, ${actorId}) as care_actor_role
  `.execute(db);
  return r.rows[0]?.care_actor_role ?? null;
}

/** Returns the new task id, or null when the actor has no relationship to the
 * patient (the service turns that into a 404 — entity-non-leaking). */
export async function careTaskCreateForPatient(
  db: Kysely<Database>,
  input: {
    patientId: string;
    actorId: string;
    title: string;
    type: string;
    subtype: string;
    schedule: unknown;
  },
): Promise<string | null> {
  const r = await sql<{ care_task_create_for_patient: string | null }>`
    select care_task_create_for_patient(
      ${input.patientId}, ${input.actorId}, ${input.title},
      ${input.type}, ${input.subtype}, ${JSON.stringify(input.schedule)}::jsonb
    ) as care_task_create_for_patient
  `.execute(db);
  return r.rows[0]?.care_task_create_for_patient ?? null;
}

export type OccurrenceActionResult =
  | 'done'
  | 'progress'
  | 'skipped'
  | 'undone'
  | 'not_found'
  | 'family_forbidden'
  | 'already_done'
  | 'already_skipped'
  | 'nothing_to_undo'
  | 'not_actor'
  | 'window_expired';

export async function occurrenceComplete(
  db: Kysely<Database>,
  occurrenceId: string,
  actorId: string,
  counterValue: number | null,
): Promise<OccurrenceActionResult> {
  const r = await sql<{ occurrence_complete: OccurrenceActionResult }>`
    select occurrence_complete(${occurrenceId}, ${actorId}, ${counterValue}) as occurrence_complete
  `.execute(db);
  return r.rows[0]?.occurrence_complete ?? 'not_found';
}

export async function occurrenceSkip(
  db: Kysely<Database>,
  occurrenceId: string,
  actorId: string,
): Promise<OccurrenceActionResult> {
  const r = await sql<{ occurrence_skip: OccurrenceActionResult }>`
    select occurrence_skip(${occurrenceId}, ${actorId}) as occurrence_skip
  `.execute(db);
  return r.rows[0]?.occurrence_skip ?? 'not_found';
}

export async function occurrenceUndo(
  db: Kysely<Database>,
  occurrenceId: string,
  actorId: string,
  windowSeconds: number,
): Promise<OccurrenceActionResult> {
  const r = await sql<{ occurrence_undo: OccurrenceActionResult }>`
    select occurrence_undo(${occurrenceId}, ${actorId}, ${windowSeconds}) as occurrence_undo
  `.execute(db);
  return r.rows[0]?.occurrence_undo ?? 'not_found';
}

/** Writes planned occurrences for a task. SECURITY DEFINER because a
 * family/caregiver-created task materializes rows the PATIENT owns — see the
 * function's comment in migration 0020. Returns how many were newly inserted
 * (0 when they all already existed, which is the normal idempotent case). */
export async function occurrencesMaterialize(
  db: Kysely<Database>,
  taskId: string,
  actorId: string,
  planned: { date_local: string; time_local: string | null }[],
  isCounter: boolean,
): Promise<number> {
  const r = await sql<{ occurrences_materialize: number }>`
    select occurrences_materialize(
      ${taskId}, ${actorId}, ${JSON.stringify(planned)}::jsonb, ${isCounter}
    ) as occurrences_materialize
  `.execute(db);
  return Number(r.rows[0]?.occurrences_materialize ?? 0);
}
