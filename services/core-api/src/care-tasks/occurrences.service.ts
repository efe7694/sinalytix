import { Inject, Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import { occurrenceComplete, occurrenceSkip, occurrenceUndo, withRlsContext } from '@sinalytix/db';
import type { OccurrenceActionResult } from '@sinalytix/db';
import { B1_RULE_ID, type CareTaskOccurrencePublic } from '@sinalytix/domain';
import { KYSELY } from '../common/db.module';
import { ApiException } from '../common/api.exception';
import { CareTasksService } from './care-tasks.service';

/**
 * Server-side undo window, in seconds.
 *
 * The Patient UI shows FIVE seconds; the server allows TEN. That +5s is
 * deliberate and inherited from the legacy engine (LEGACY_HARVEST Faz 2:
 * "Undo window is 10s server-side though the UI shows 5s — intentional +5s
 * for network latency. Do not tighten to 5s on the server."). A patient who
 * taps undo on the fifth second over a slow connection must not be told the
 * window closed while their screen still showed it open.
 *
 * Not a `SystemConfig` key: it is a client-contract constant paired with the
 * UI's countdown, not an ops dial — moving one without the other reintroduces
 * exactly the mismatch the +5s exists to absorb.
 */
const UNDO_WINDOW_SECONDS = 10;

interface OccurrenceRow {
  occurrence_id: string;
  task_id: string;
  patient_id: string;
  date_local: string;
  time_local: string | null;
  status: string;
  progress_count: number | null;
  completed_at: Date | null;
  completed_by: string | null;
  completed_by_actor_type: string | null;
  carry_over_from: string | null;
  title: string;
  type: string;
  subtype: string;
  task_status: string;
  created_by_actor_type: string;
  schedule: unknown;
}

function toPublic(row: OccurrenceRow): CareTaskOccurrencePublic {
  const schedule = (row.schedule ?? {}) as { target_per_day?: number };
  return {
    occurrence_id: row.occurrence_id,
    task_id: row.task_id,
    patient_id: row.patient_id,
    // A plain `YYYY-MM-DD` — the pg DATE type parser (packages/db client)
    // hands the raw string through precisely so no timezone conversion can
    // shift the day.
    date_local: row.date_local,
    time_local: row.time_local,
    status: row.status as CareTaskOccurrencePublic['status'],
    progress_count: row.progress_count,
    target_per_day: typeof schedule.target_per_day === 'number' ? schedule.target_per_day : null,
    completed_at: row.completed_at?.toISOString() ?? null,
    completed_by: row.completed_by,
    completed_by_actor_type: row.completed_by_actor_type as CareTaskOccurrencePublic['completed_by_actor_type'],
    carry_over_from: row.carry_over_from,
    title: row.title,
    type: row.type as CareTaskOccurrencePublic['type'],
    subtype: row.subtype as CareTaskOccurrencePublic['subtype'],
    task_status: row.task_status as CareTaskOccurrencePublic['task_status'],
    created_by_actor_type: row.created_by_actor_type as CareTaskOccurrencePublic['created_by_actor_type'],
  };
}

/**
 * `CareTaskOccurrence` — one day of one task, and the only thing that is ever
 * "completed" (Sözlükçe: "occurrence tamamlanır, task tamamlanmaz").
 *
 * `GET /occurrences?date=` is the single source for all four apps' "today"
 * view (Modül 2 §3.3), so it is also the read that triggers the lazy backfill
 * for days outside the eager window.
 */
@Injectable()
export class OccurrencesService {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    private readonly careTasks: CareTasksService,
  ) {}

  /**
   * The day list. Anyone in the patient's circle may READ (RLS SELECT
   * policies) — B1 is about writing, not seeing.
   */
  async listForDate(patientId: string, actingUserId: string, dateLocal?: string): Promise<CareTaskOccurrencePublic[]> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      const role = await this.careTasks.actorRole(trx, patientId, actingUserId);
      if (!role) throw ApiException.notFound();

      const date = dateLocal ?? (await this.careTasks.todayFor(trx, patientId));
      // Lazy backfill (Modül 3 §5): a day beyond the eager window is
      // materialized on demand, under the same unique index, so a client
      // scrolling ahead sees a real list instead of an empty one.
      await this.careTasks.ensureDayGenerated(trx, patientId, date, actingUserId);

      const rows = await trx
        .selectFrom('care_task_occurrences as o')
        .innerJoin('care_tasks as t', 't.task_id', 'o.task_id')
        .select([
          'o.occurrence_id', 'o.task_id', 'o.patient_id', 'o.date_local', 'o.time_local',
          'o.status', 'o.progress_count', 'o.completed_at', 'o.completed_by',
          'o.completed_by_actor_type', 'o.carry_over_from',
          't.title', 't.type', 't.subtype', 't.schedule', 't.created_by_actor_type',
        ])
        .select('t.status as task_status')
        .where('o.patient_id', '=', patientId)
        .where('o.date_local', '=', date)
        .where('t.deleted_at', 'is', null)
        .orderBy('o.time_local', 'asc')
        .orderBy('t.created_at', 'asc')
        .execute();
      return rows.map((r) => toPublic(r as unknown as OccurrenceRow));
    });
  }

  // ── Actions ────────────────────────────────────────────────────────────

  /**
   * B1's enforcement point (Modül 2 §3.3). A family actor gets a 403 carrying
   * the canonical rule id, so the client can say "your family account can add
   * tasks but not tick them off" instead of a generic permission error.
   */
  async complete(occurrenceId: string, actingUserId: string, counterValue: number | null): Promise<CareTaskOccurrencePublic> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      const result = await occurrenceComplete(trx, occurrenceId, actingUserId, counterValue);
      this.assertOk(result, 'complete');
      return this.reread(trx, occurrenceId);
    });
  }

  async skip(occurrenceId: string, actingUserId: string): Promise<CareTaskOccurrencePublic> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      const result = await occurrenceSkip(trx, occurrenceId, actingUserId);
      this.assertOk(result, 'skip');
      return this.reread(trx, occurrenceId);
    });
  }

  async undo(occurrenceId: string, actingUserId: string): Promise<CareTaskOccurrencePublic> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      const result = await occurrenceUndo(trx, occurrenceId, actingUserId, UNDO_WINDOW_SECONDS);
      this.assertOk(result, 'undo');
      return this.reread(trx, occurrenceId);
    });
  }

  /** Maps the SECURITY DEFINER function's outcome to a precise status code.
   * `progress` and the terminal successes fall through as success. */
  private assertOk(result: OccurrenceActionResult, action: 'complete' | 'skip' | 'undo'): void {
    switch (result) {
      case 'done':
      case 'progress':
      case 'skipped':
      case 'undone':
        return;
      case 'family_forbidden':
        throw ApiException.permissionDenied('care_task.family_cannot_complete', [
          { field: 'rule', issue: B1_RULE_ID },
        ]);
      case 'not_found':
        throw ApiException.notFound();
      case 'already_done':
        throw ApiException.conflict('care_task.already_done');
      case 'already_skipped':
        throw ApiException.conflict('care_task.already_skipped');
      case 'nothing_to_undo':
        throw ApiException.conflict('care_task.nothing_to_undo');
      case 'not_actor':
        throw ApiException.permissionDenied('care_task.undo_actor_only');
      case 'window_expired':
        throw ApiException.conflict('care_task.undo_window_expired');
      default: {
        // A new outcome string added to the SQL function without a mapping
        // here must fail loudly, not be silently treated as success.
        throw new Error(`unhandled occurrence ${action} result: ${String(result)}`);
      }
    }
  }

  private async reread(trx: Kysely<Database>, occurrenceId: string): Promise<CareTaskOccurrencePublic> {
    const row = await trx
      .selectFrom('care_task_occurrences as o')
      .innerJoin('care_tasks as t', 't.task_id', 'o.task_id')
      .select([
        'o.occurrence_id', 'o.task_id', 'o.patient_id', 'o.date_local', 'o.time_local',
        'o.status', 'o.progress_count', 'o.completed_at', 'o.completed_by',
        'o.completed_by_actor_type', 'o.carry_over_from',
        't.title', 't.type', 't.subtype', 't.schedule',
      ])
      .select('t.status as task_status')
      .where('o.occurrence_id', '=', occurrenceId)
      .executeTakeFirstOrThrow();
    return toPublic(row as unknown as OccurrenceRow);
  }
}
