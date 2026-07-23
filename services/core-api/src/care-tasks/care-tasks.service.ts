import { Inject, Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import { careActorRole, careTaskCreateForPatient, occurrencesMaterialize, withRlsContext } from '@sinalytix/db';
import {
  CareTaskStatus,
  CareTaskType,
  OCCURRENCE_EAGER_WINDOW_DAYS,
  addLocalDays,
  localDateInTimezone,
  planOccurrences,
  scheduleSchemaFor,
  type CareTaskPublic,
  type CareTaskSchedule,
  type CreateCareTaskRequest,
  type UpdateCareTaskRequest,
} from '@sinalytix/domain';
import { KYSELY } from '../common/db.module';
import { ApiException } from '../common/api.exception';

interface TaskRow {
  task_id: string;
  patient_id: string;
  parent_task_id: string | null;
  title: string;
  type: string;
  subtype: string;
  schedule: unknown;
  status: string;
  created_by: string;
  created_by_actor_type: string;
  source_provenance: string;
  version: number;
  created_at: Date;
}

function toPublic(row: TaskRow): CareTaskPublic {
  return {
    task_id: row.task_id,
    patient_id: row.patient_id,
    parent_task_id: row.parent_task_id,
    title: row.title,
    type: row.type as CareTaskPublic['type'],
    subtype: row.subtype as CareTaskPublic['subtype'],
    schedule: (row.schedule ?? {}) as Record<string, unknown>,
    status: row.status as CareTaskPublic['status'],
    created_by: row.created_by,
    created_by_actor_type: row.created_by_actor_type as CareTaskPublic['created_by_actor_type'],
    source_provenance: row.source_provenance,
    version: row.version,
    created_at: row.created_at.toISOString(),
  };
}

/**
 * `CareTask` — the definition of a recurring care action, and the engine that
 * materializes it into per-day occurrences (K7).
 *
 * Occurrence generation lives here rather than only in the nightly job
 * because Modül 3 §5 requires BOTH: an eager D+7 window written each night,
 * and a lazy backfill when a read asks for a day outside it. Both call the
 * same `planOccurrences` (`@sinalytix/domain`) and both insert with
 * `ON CONFLICT DO NOTHING`, which is what makes re-running harmless.
 */
@Injectable()
export class CareTasksService {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  // ── Create ─────────────────────────────────────────────────────────────

  /**
   * Creates a task for `patientId`. The patient, an active family member, a
   * linked caregiver (and later a clinician/agent) may all create — B1
   * restricts COMPLETION, not creation (Modül 2 §3.3 is explicit that family
   * "oluşturabilir").
   *
   * `created_by_actor_type` is derived server-side from the link tables
   * inside the SECURITY DEFINER function, never taken from the client:
   * otherwise a family member could label their own task caregiver-created
   * and change how the patient's list renders it.
   */
  async create(patientId: string, actingUserId: string, body: CreateCareTaskRequest): Promise<CareTaskPublic> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      const taskId = await careTaskCreateForPatient(trx, {
        patientId,
        actorId: actingUserId,
        title: body.title,
        type: body.type,
        subtype: body.subtype,
        schedule: body.schedule,
      });
      // No relationship to this patient → 404, not 403: an unrelated caller
      // must not learn the patient exists (Modül 1 §11).
      if (!taskId) throw ApiException.notFound();

      // Materialize the eager window immediately. Without this, a task
      // created at 10:00 would not appear on today's list until the nightly
      // job ran — which is the one thing a user checks right after adding it.
      await this.generateWindow(trx, taskId, patientId, actingUserId);

      const row = await trx.selectFrom('care_tasks').selectAll().where('task_id', '=', taskId).executeTakeFirstOrThrow();
      return toPublic(row as unknown as TaskRow);
    });
  }

  // ── Read ───────────────────────────────────────────────────────────────

  async list(patientId: string, actingUserId: string): Promise<CareTaskPublic[]> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      const rows = await trx
        .selectFrom('care_tasks')
        .selectAll()
        .where('patient_id', '=', patientId)
        .where('deleted_at', 'is', null)
        .orderBy('created_at', 'desc')
        .execute();
      return rows.map((r) => toPublic(r as unknown as TaskRow));
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────

  /**
   * Edits a task. `If-Match` carries the `version` the client last saw
   * (Modül 2 §3.3) — MANDATORY for the medication subtype, where two people
   * editing a dose simultaneously is a safety problem, and merely recommended
   * elsewhere.
   *
   * Only the patient may edit (RLS owner policy). A family/caregiver edit of
   * someone else's task is a FAM-13 permission question that V0 leaves open
   * (Family PRD flags it as a V1 decision), so it is not silently allowed
   * here.
   */
  async update(
    taskId: string,
    actingUserId: string,
    body: UpdateCareTaskRequest,
    ifMatch: number | null,
  ): Promise<CareTaskPublic> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      const existing = await trx
        .selectFrom('care_tasks')
        .selectAll()
        .where('task_id', '=', taskId)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();
      if (!existing || existing.patient_id !== actingUserId) throw ApiException.notFound();

      if (existing.subtype === 'medication' && ifMatch === null) {
        throw ApiException.badRequest('care_task.if_match_required_for_medication');
      }
      if (ifMatch !== null && ifMatch !== existing.version) {
        throw ApiException.conflictVersion([{ field: 'version', issue: 'stale' }]);
      }

      // A schedule change must be validated against the task's OWN type — the
      // type is immutable precisely so this check has a fixed target.
      if (body.schedule !== undefined) {
        const parsed = scheduleSchemaFor(existing.type as CareTaskType).safeParse(body.schedule);
        if (!parsed.success) {
          throw ApiException.validationFailed(
            parsed.error.issues.map((i) => ({ field: `schedule.${i.path.join('.')}`, issue: i.code })),
          );
        }
      }

      const updated = await trx
        .updateTable('care_tasks')
        .set({
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.subtype !== undefined ? { subtype: body.subtype } : {}),
          ...(body.schedule !== undefined ? { schedule: JSON.stringify(body.schedule) } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
        })
        .where('task_id', '=', taskId)
        .returningAll()
        .executeTakeFirstOrThrow();

      // Modül 3 §5 change semantics: future `todo` occurrences are regenerated;
      // `done`/`skipped` history is NEVER touched. Pausing stops generation
      // but leaves existing rows alone so the UI can show "duraklatıldı".
      if (body.schedule !== undefined || body.status !== undefined) {
        await this.regenerateFuture(trx, updated as unknown as TaskRow, actingUserId);
      }

      await trx
        .insertInto('activity_log')
        .values({
          patient_id: actingUserId,
          entity_type: 'care_task',
          entity_id: taskId,
          task_id: taskId,
          action: 'edited',
          actor_type: 'patient',
          actor_id: actingUserId,
          diff: JSON.stringify(body),
        })
        .execute();

      return toPublic(updated as unknown as TaskRow);
    });
  }

  async remove(taskId: string, actingUserId: string): Promise<void> {
    await withRlsContext(this.db, { actingUserId }, async (trx) => {
      const existing = await trx
        .selectFrom('care_tasks')
        .select(['task_id', 'patient_id'])
        .where('task_id', '=', taskId)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();
      if (!existing || existing.patient_id !== actingUserId) throw ApiException.notFound();

      // Soft-delete (Modül 1 §1.4). Future `todo` occurrences go too — a
      // deleted task must stop appearing on tomorrow's list — but completed
      // history stays, because "did you take it on the 3rd" must remain
      // answerable after the task is gone.
      await trx.updateTable('care_tasks').set({ deleted_at: new Date(), status: CareTaskStatus.CANCELLED }).where('task_id', '=', taskId).execute();
      await this.deleteFutureTodo(trx, taskId, existing.patient_id);

      await trx
        .insertInto('activity_log')
        .values({
          patient_id: actingUserId,
          entity_type: 'care_task',
          entity_id: taskId,
          task_id: taskId,
          action: 'deleted',
          actor_type: 'patient',
          actor_id: actingUserId,
        })
        .execute();
    });
  }

  // ── Occurrence generation (K7) ─────────────────────────────────────────

  /** Patient-local today. Falls back to Toronto: the V0 market is Ontario
   * (Kapsam Matrisi), and a missing timezone must still produce a sane day
   * rather than throwing on a read path. */
  private async patientToday(trx: Kysely<Database>, patientId: string): Promise<string> {
    const profile = await trx
      .selectFrom('patient_profiles')
      .select('timezone_iana')
      .where('user_id', '=', patientId)
      .executeTakeFirst();
    return localDateInTimezone(new Date(), profile?.timezone_iana ?? 'America/Toronto');
  }

  /** Writes the K7 eager window (today … today+7) for one task. */
  async generateWindow(
    trx: Kysely<Database>,
    taskId: string,
    patientId: string,
    actorId: string,
    fromDate?: string,
  ): Promise<number> {
    const task = await trx
      .selectFrom('care_tasks')
      .selectAll()
      .where('task_id', '=', taskId)
      .executeTakeFirst();
    // Paused/cancelled/deleted tasks stop generating; existing rows survive.
    if (!task || task.deleted_at || task.status !== CareTaskStatus.ACTIVE) return 0;

    const from = fromDate ?? (await this.patientToday(trx, patientId));
    const to = addLocalDays(from, OCCURRENCE_EAGER_WINDOW_DAYS);
    return this.materialize(trx, task as unknown as TaskRow, from, to, actorId);
  }

  /**
   * The lazy backfill (Modül 3 §5): a read for a day outside the eager window
   * generates it on demand, under the same unique constraint.
   */
  async ensureDayGenerated(trx: Kysely<Database>, patientId: string, dateLocal: string, actorId: string): Promise<void> {
    const tasks = await trx
      .selectFrom('care_tasks')
      .selectAll()
      .where('patient_id', '=', patientId)
      .where('deleted_at', 'is', null)
      .where('status', '=', CareTaskStatus.ACTIVE)
      .execute();
    for (const t of tasks) {
      await this.materialize(trx, t as unknown as TaskRow, dateLocal, dateLocal, actorId);
    }
  }

  /**
   * Inserts the planned occurrences, ignoring ones that already exist.
   * `ON CONFLICT DO NOTHING` against the partial unique index is what makes
   * K7's "tekrar koşum zararsız" true — the nightly job and a concurrent lazy
   * backfill can race without producing a duplicate dose.
   */
  private async materialize(
    trx: Kysely<Database>,
    task: TaskRow,
    from: string,
    to: string,
    actorId: string,
  ): Promise<number> {
    const parsed = scheduleSchemaFor(task.type as CareTaskType).safeParse(task.schedule);
    // A stored schedule that no longer validates generates NOTHING rather
    // than guessing. Silently inventing a daily dose from a malformed row
    // would be far worse than an empty list the patient can see is wrong.
    if (!parsed.success) return 0;

    const planned = planOccurrences(task.type as CareTaskType, parsed.data as CareTaskSchedule, from, to);
    if (planned.length === 0) return 0;

    // SECURITY DEFINER, because a family/caregiver-created task materializes
    // rows the PATIENT owns and `care_task_occurrences` has no cross-actor
    // INSERT policy by design (D12 discipline). The function re-derives the
    // actor's role rather than trusting this call site.
    return occurrencesMaterialize(trx, task.task_id, actorId, planned, task.type === CareTaskType.COUNTER);
  }

  /** Regenerates FUTURE `todo` occurrences after a schedule/status edit.
   * Past and already-actioned rows are untouched (Modül 3 §5). */
  private async regenerateFuture(trx: Kysely<Database>, task: TaskRow, actorId: string): Promise<void> {
    const today = await this.patientToday(trx, task.patient_id);
    await this.deleteFutureTodo(trx, task.task_id, task.patient_id, today);
    if (task.status === CareTaskStatus.ACTIVE) {
      await this.generateWindow(trx, task.task_id, task.patient_id, actorId, today);
    }
  }

  private async deleteFutureTodo(
    trx: Kysely<Database>,
    taskId: string,
    patientId: string,
    fromDate?: string,
  ): Promise<void> {
    const today = fromDate ?? (await this.patientToday(trx, patientId));
    await trx
      .deleteFrom('care_task_occurrences')
      .where('task_id', '=', taskId)
      .where('status', '=', 'todo')
      // Strictly AFTER today: today's row may already be on screen, and
      // deleting it mid-day would make a task the patient is looking at
      // vanish. Only genuinely future days are rewritten.
      .where('date_local', '>', today)
      .where('carry_over_from', 'is', null)
      .execute();
  }

  /** Shared by the occurrences read path. */
  async actorRole(trx: Kysely<Database>, patientId: string, actorId: string): Promise<string | null> {
    return careActorRole(trx, patientId, actorId);
  }

  async todayFor(trx: Kysely<Database>, patientId: string): Promise<string> {
    return this.patientToday(trx, patientId);
  }
}
