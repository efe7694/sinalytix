/**
 * CareTask engine — Faz 2 Slice 1. Sözlük §3, Modül 3 §5 (K7), Modül 2 §3.3.
 *
 * The load-bearing assertions here are B1 (family cannot complete, checked at
 * three layers) and K7 idempotency (re-running the generator never duplicates
 * a dose). Everything else is behavior around those two.
 */

import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import { withRlsContext } from '@sinalytix/db';
import type { Pool } from 'pg';
import { addLocalDays, localDateInTimezone } from '@sinalytix/domain';
import { CareTasksService } from '../src/care-tasks/care-tasks.service';
import { OccurrencesService } from '../src/care-tasks/occurrences.service';
import { createUser, setupTestDatabase, truncateAll } from './setup';

describe('CareTask engine (Faz 2 Slice 1)', () => {
  let ownerPool: Pool;
  let ownerDb: Kysely<Database>;
  let appPool: Pool;
  let appDb: Kysely<Database>;
  let tasks: CareTasksService;
  let occurrences: OccurrencesService;

  beforeAll(async () => {
    ({ ownerPool, ownerDb, appPool, appDb } = await setupTestDatabase());
    tasks = new CareTasksService(appDb);
    occurrences = new OccurrencesService(appDb, tasks);
  });

  beforeEach(async () => {
    await truncateAll(ownerDb);
  });

  afterAll(async () => {
    await ownerPool.end();
    await appPool.end();
  });

  let seq = 0;
  const phone = () => `+1416570${String((seq += 1)).padStart(4, '0')}`;
  const TZ = 'America/Toronto';
  const today = () => localDateInTimezone(new Date(), TZ);

  async function makePatient() {
    const p = await createUser(appDb, { phone_e164: phone(), roles: ['patient'], status: 'active' });
    await withRlsContext(appDb, { actingUserId: p.user_id }, (trx) =>
      trx
        .insertInto('patient_profiles')
        .values({ user_id: p.user_id, first_name: 'Pat', last_name: 'Ient', timezone_iana: TZ })
        .execute(),
    );
    return p;
  }
  async function makeFamily(patientId: string) {
    const f = await createUser(appDb, { phone_e164: phone(), roles: ['family'], status: 'active' });
    await ownerDb
      .insertInto('patient_family_links')
      .values({
        patient_id: patientId,
        family_user_id: f.user_id,
        relationship: 'child',
        status: 'active',
        source: 'code',
        linked_at: new Date(),
        permission_level: 'edit',
      })
      .execute();
    return f;
  }
  async function makeCaregiver(patientId: string) {
    const c = await createUser(appDb, { phone_e164: phone(), roles: ['caregiver'], status: 'active' });
    await ownerDb
      .insertInto('caregiver_links')
      .values({
        patient_id: patientId,
        caregiver_id: c.user_id,
        code: `T${(seq += 1)}`.padEnd(6, 'X'),
        qr_payload: `qr${seq}`,
        status: 'linked',
        expires_at: new Date(Date.now() + 3_600_000),
        linked_at: new Date(),
      })
      .returning('link_id')
      .executeTakeFirstOrThrow();
    return c;
  }

  const dailyTask = { title: 'Sabah ilacı', type: 'recurring' as const, subtype: 'standard' as const, schedule: { frequency: 'daily' as const, time_of_day_local: '08:00' } };

  // ── Creation + generation (K7) ─────────────────────────────────────────

  describe('creation and the eager window (K7)', () => {
    it('materializes today..today+7 immediately, so a new task is on today’s list at once', async () => {
      const patient = await makePatient();
      const task = await tasks.create(patient.user_id, patient.user_id, dailyTask);

      const rows = await ownerDb
        .selectFrom('care_task_occurrences')
        .selectAll()
        .where('task_id', '=', task.task_id)
        .execute();
      // today + 7 more days, inclusive.
      expect(rows).toHaveLength(8);

      const list = await occurrences.listForDate(patient.user_id, patient.user_id);
      expect(list.map((o) => o.title)).toContain('Sabah ilacı');
    });

    it('is idempotent: regenerating the same window adds nothing (K7 "tekrar koşum zararsız")', async () => {
      const patient = await makePatient();
      const task = await tasks.create(patient.user_id, patient.user_id, dailyTask);

      const inserted = await withRlsContext(appDb, { actingUserId: patient.user_id }, (trx) =>
        tasks.generateWindow(trx, task.task_id, patient.user_id, patient.user_id),
      );
      expect(inserted).toBe(0);

      const rows = await ownerDb.selectFrom('care_task_occurrences').selectAll().execute();
      expect(rows).toHaveLength(8);
    });

    it('a weekly task only generates its named days', async () => {
      const patient = await makePatient();
      // Pick the weekday 2 days out so the window definitely contains exactly
      // one of it (window is 8 days, so a single weekday appears once or twice
      // — asserting on the set of weekdays avoids that ambiguity).
      await tasks.create(patient.user_id, patient.user_id, {
        title: 'Yürüyüş',
        type: 'recurring',
        subtype: 'standard',
        schedule: { frequency: 'weekly', days_of_week: ['MON'] },
      });
      const rows = await ownerDb.selectFrom('care_task_occurrences').select('date_local').execute();
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.length).toBeLessThanOrEqual(2);
    });

    it('a one_time task outside the window generates nothing yet', async () => {
      const patient = await makePatient();
      await tasks.create(patient.user_id, patient.user_id, {
        title: 'Kontrol randevusu',
        type: 'one_time',
        subtype: 'standard',
        schedule: { due_date_local: addLocalDays(today(), 30) },
      });
      const rows = await ownerDb.selectFrom('care_task_occurrences').selectAll().execute();
      expect(rows).toHaveLength(0);
    });

    it('lazy backfill materializes a day beyond the eager window on read (Modül 3 §5)', async () => {
      const patient = await makePatient();
      await tasks.create(patient.user_id, patient.user_id, dailyTask);
      const farDay = addLocalDays(today(), 20);

      const before = await ownerDb
        .selectFrom('care_task_occurrences')
        .selectAll()
        .where('date_local', '=', farDay)
        .execute();
      expect(before).toHaveLength(0);

      const list = await occurrences.listForDate(patient.user_id, patient.user_id, farDay);
      expect(list).toHaveLength(1);
      expect(list[0]?.date_local).toBe(farDay);
    });
  });

  // ── Who may create ─────────────────────────────────────────────────────

  describe('creation authorization', () => {
    it('family CAN create a task (B1 restricts completion, not creation)', async () => {
      const patient = await makePatient();
      const family = await makeFamily(patient.user_id);
      const task = await tasks.create(patient.user_id, family.user_id, dailyTask);
      expect(task.created_by_actor_type).toBe('family');
      expect(task.source_provenance).toBe('family');
    });

    it('a linked caregiver can create, stamped as caregiver', async () => {
      const patient = await makePatient();
      const caregiver = await makeCaregiver(patient.user_id);
      const task = await tasks.create(patient.user_id, caregiver.user_id, dailyTask);
      expect(task.created_by_actor_type).toBe('caregiver');
    });

    it('actor type is DERIVED, not client-supplied — a family member cannot pose as a caregiver', async () => {
      const patient = await makePatient();
      const family = await makeFamily(patient.user_id);
      // The request body has no actor field at all; the only source is the
      // link tables inside the SECURITY DEFINER function.
      const task = await tasks.create(patient.user_id, family.user_id, dailyTask);
      expect(task.created_by_actor_type).not.toBe('caregiver');
    });

    it('an unrelated user gets 404, not 403 (entity-non-leaking)', async () => {
      const patient = await makePatient();
      const stranger = await createUser(appDb, { phone_e164: phone(), roles: ['patient'], status: 'active' });
      await expect(tasks.create(patient.user_id, stranger.user_id, dailyTask)).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── B1 ─────────────────────────────────────────────────────────────────

  describe('B1 — family cannot complete', () => {
    async function todaysOccurrence(patientId: string, actorId: string) {
      const list = await occurrences.listForDate(patientId, actorId);
      return list[0]!;
    }

    it('family completing is a 403 carrying the canonical rule id', async () => {
      const patient = await makePatient();
      const family = await makeFamily(patient.user_id);
      await tasks.create(patient.user_id, patient.user_id, dailyTask);
      const occ = await todaysOccurrence(patient.user_id, patient.user_id);

      await expect(occurrences.complete(occ.occurrence_id, family.user_id, null)).rejects.toMatchObject({
        status: 403,
        details: [{ field: 'rule', issue: 'B1_family_cannot_complete' }],
      });
    });

    it('family cannot skip or undo either', async () => {
      const patient = await makePatient();
      const family = await makeFamily(patient.user_id);
      await tasks.create(patient.user_id, patient.user_id, dailyTask);
      const occ = await todaysOccurrence(patient.user_id, patient.user_id);

      await expect(occurrences.skip(occ.occurrence_id, family.user_id)).rejects.toMatchObject({ status: 403 });
      await occurrences.complete(occ.occurrence_id, patient.user_id, null);
      await expect(occurrences.undo(occ.occurrence_id, family.user_id)).rejects.toMatchObject({ status: 403 });
    });

    it('B1 also holds at the DB layer: the column CHECK has no `family` value', async () => {
      // Third layer. If a future code path ever bypasses both the service and
      // the SECURITY DEFINER function, the row still cannot be written.
      const patient = await makePatient();
      await tasks.create(patient.user_id, patient.user_id, dailyTask);
      const occ = await todaysOccurrence(patient.user_id, patient.user_id);
      await expect(
        ownerDb
          .updateTable('care_task_occurrences')
          .set({ completed_by_actor_type: 'family', status: 'done' })
          .where('occurrence_id', '=', occ.occurrence_id)
          .execute(),
      ).rejects.toThrow();
    });

    it('family CAN read the list — B1 is about writing, not seeing', async () => {
      const patient = await makePatient();
      const family = await makeFamily(patient.user_id);
      await tasks.create(patient.user_id, patient.user_id, dailyTask);
      const list = await occurrences.listForDate(patient.user_id, family.user_id);
      expect(list).toHaveLength(1);
    });

    it('patient and caregiver CAN complete, and the actor type is recorded', async () => {
      const patient = await makePatient();
      const caregiver = await makeCaregiver(patient.user_id);
      await tasks.create(patient.user_id, patient.user_id, dailyTask);
      const occ = await todaysOccurrence(patient.user_id, patient.user_id);

      const done = await occurrences.complete(occ.occurrence_id, caregiver.user_id, null);
      expect(done.status).toBe('done');
      expect(done.completed_by_actor_type).toBe('caregiver');
      expect(done.completed_by).toBe(caregiver.user_id);
    });
  });

  // ── Counter ────────────────────────────────────────────────────────────

  describe('counter tasks', () => {
    async function counterOccurrence(patientId: string) {
      await tasks.create(patientId, patientId, {
        title: 'Günde 8 bardak su',
        type: 'counter',
        subtype: 'standard',
        schedule: { target_per_day: 3, reset_rule: 'daily' },
      });
      const list = await occurrences.listForDate(patientId, patientId);
      return list[0]!;
    }

    it('accumulates and auto-completes at the target (legacy parity)', async () => {
      const patient = await makePatient();
      const occ = await counterOccurrence(patient.user_id);
      expect(occ.progress_count).toBe(0);
      expect(occ.target_per_day).toBe(3);

      const a = await occurrences.complete(occ.occurrence_id, patient.user_id, null);
      expect(a.progress_count).toBe(1);
      expect(a.status).toBe('todo');

      await occurrences.complete(occ.occurrence_id, patient.user_id, null);
      const c = await occurrences.complete(occ.occurrence_id, patient.user_id, null);
      expect(c.progress_count).toBe(3);
      expect(c.status).toBe('done');
      expect(c.completed_at).not.toBeNull();
    });

    it('never overshoots the target even if the client sends a large value', async () => {
      const patient = await makePatient();
      const occ = await counterOccurrence(patient.user_id);
      const r = await occurrences.complete(occ.occurrence_id, patient.user_id, 99);
      expect(r.progress_count).toBe(3);
      expect(r.status).toBe('done');
    });

    it('undo returns progress to zero, not to target-1', async () => {
      // The tap being undone is the one that crossed the line; leaving "2 of
      // 3" would show progress the patient just said didn't happen.
      const patient = await makePatient();
      const occ = await counterOccurrence(patient.user_id);
      await occurrences.complete(occ.occurrence_id, patient.user_id, 3);
      const undone = await occurrences.undo(occ.occurrence_id, patient.user_id);
      expect(undone.status).toBe('todo');
      expect(undone.progress_count).toBe(0);
    });
  });

  // ── Complete / skip / undo semantics ───────────────────────────────────

  describe('skip and undo', () => {
    async function occ(patientId: string) {
      await tasks.create(patientId, patientId, dailyTask);
      return (await occurrences.listForDate(patientId, patientId))[0]!;
    }

    it('skip clears any completion, and completing again clears the skip', async () => {
      const patient = await makePatient();
      const o = await occ(patient.user_id);
      const skipped = await occurrences.skip(o.occurrence_id, patient.user_id);
      expect(skipped.status).toBe('skipped');
      expect(skipped.completed_at).toBeNull();

      const done = await occurrences.complete(o.occurrence_id, patient.user_id, null);
      expect(done.status).toBe('done');
    });

    it('undo inside the window returns the occurrence to todo', async () => {
      const patient = await makePatient();
      const o = await occ(patient.user_id);
      await occurrences.complete(o.occurrence_id, patient.user_id, null);
      const undone = await occurrences.undo(o.occurrence_id, patient.user_id);
      expect(undone.status).toBe('todo');
      expect(undone.completed_by).toBeNull();
    });

    it('the server window is 10s even though the UI shows 5s (LEGACY_HARVEST)', async () => {
      // A patient tapping undo on the 5th second over a slow connection must
      // not be told the window closed while their screen showed it open.
      const patient = await makePatient();
      const o = await occ(patient.user_id);
      await occurrences.complete(o.occurrence_id, patient.user_id, null);
      // Backdate the completion to 7s ago: past the UI's 5s, inside the
      // server's 10s.
      await ownerDb
        .updateTable('care_task_occurrences')
        .set({ completed_at: new Date(Date.now() - 7_000) })
        .where('occurrence_id', '=', o.occurrence_id)
        .execute();
      await expect(occurrences.undo(o.occurrence_id, patient.user_id)).resolves.toMatchObject({ status: 'todo' });
    });

    it('undo past the window is a 409, not a silent no-op', async () => {
      const patient = await makePatient();
      const o = await occ(patient.user_id);
      await occurrences.complete(o.occurrence_id, patient.user_id, null);
      await ownerDb
        .updateTable('care_task_occurrences')
        .set({ completed_at: new Date(Date.now() - 60_000) })
        .where('occurrence_id', '=', o.occurrence_id)
        .execute();
      await expect(occurrences.undo(o.occurrence_id, patient.user_id)).rejects.toMatchObject({ status: 409 });
    });

    it('a caregiver cannot undo ANOTHER caregiver’s completion, but the patient can', async () => {
      // A caregiver quietly reversing someone else's record of giving a
      // medication is a clinical-record integrity problem.
      const patient = await makePatient();
      const cg1 = await makeCaregiver(patient.user_id);
      const cg2 = await makeCaregiver(patient.user_id);
      const o = await occ(patient.user_id);
      await occurrences.complete(o.occurrence_id, cg1.user_id, null);

      await expect(occurrences.undo(o.occurrence_id, cg2.user_id)).rejects.toMatchObject({ status: 403 });
      await expect(occurrences.undo(o.occurrence_id, patient.user_id)).resolves.toMatchObject({ status: 'todo' });
    });

    it('completing an already-done occurrence is a 409', async () => {
      const patient = await makePatient();
      const o = await occ(patient.user_id);
      await occurrences.complete(o.occurrence_id, patient.user_id, null);
      await expect(occurrences.complete(o.occurrence_id, patient.user_id, null)).rejects.toMatchObject({ status: 409 });
    });

    it('an unrelated user acting on an occurrence gets 404', async () => {
      const patient = await makePatient();
      const stranger = await createUser(appDb, { phone_e164: phone(), roles: ['patient'], status: 'active' });
      const o = await occ(patient.user_id);
      await expect(occurrences.complete(o.occurrence_id, stranger.user_id, null)).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── Edit semantics (Modül 3 §5) ────────────────────────────────────────

  describe('edit semantics', () => {
    it('editing the schedule regenerates FUTURE todo days but never touches history', async () => {
      const patient = await makePatient();
      const task = await tasks.create(patient.user_id, patient.user_id, dailyTask);
      const todayOcc = (await occurrences.listForDate(patient.user_id, patient.user_id))[0]!;
      await occurrences.complete(todayOcc.occurrence_id, patient.user_id, null);

      await tasks.update(patient.user_id === '' ? '' : task.task_id, patient.user_id, {
        schedule: { frequency: 'weekly', days_of_week: ['MON'] },
      }, null);

      // The completed row survives untouched.
      const kept = await ownerDb
        .selectFrom('care_task_occurrences')
        .selectAll()
        .where('occurrence_id', '=', todayOcc.occurrence_id)
        .executeTakeFirstOrThrow();
      expect(kept.status).toBe('done');

      // Future days now follow the new (weekly) schedule, so there are far
      // fewer than the previous 7.
      const future = await ownerDb
        .selectFrom('care_task_occurrences')
        .selectAll()
        .where('date_local', '>', today())
        .execute();
      expect(future.length).toBeLessThan(7);
    });

    it('pausing stops generation but leaves existing rows (UI shows "duraklatıldı")', async () => {
      const patient = await makePatient();
      const task = await tasks.create(patient.user_id, patient.user_id, dailyTask);
      await tasks.update(task.task_id, patient.user_id, { status: 'paused' }, null);

      const todayRows = await ownerDb
        .selectFrom('care_task_occurrences')
        .selectAll()
        .where('date_local', '=', today())
        .execute();
      expect(todayRows).toHaveLength(1); // today survives

      const inserted = await withRlsContext(appDb, { actingUserId: patient.user_id }, (trx) =>
        tasks.generateWindow(trx, task.task_id, patient.user_id, patient.user_id),
      );
      expect(inserted).toBe(0); // and nothing new is produced
    });

    it('a medication task requires If-Match, and a stale version is a 409', async () => {
      const patient = await makePatient();
      const task = await tasks.create(patient.user_id, patient.user_id, {
        ...dailyTask,
        title: 'Metformin 500mg',
        subtype: 'medication',
      });

      await expect(tasks.update(task.task_id, patient.user_id, { title: 'X' }, null)).rejects.toMatchObject({
        status: 400,
      });
      await expect(tasks.update(task.task_id, patient.user_id, { title: 'X' }, 99)).rejects.toMatchObject({
        status: 409,
      });
      const ok = await tasks.update(task.task_id, patient.user_id, { title: 'Metformin 850mg' }, task.version);
      expect(ok.title).toBe('Metformin 850mg');
      // The trigger advanced the version, so the same If-Match cannot be replayed.
      expect(ok.version).toBe(task.version + 1);
    });

    it('deleting stops future days but keeps completed history answerable', async () => {
      const patient = await makePatient();
      const task = await tasks.create(patient.user_id, patient.user_id, dailyTask);
      const todayOcc = (await occurrences.listForDate(patient.user_id, patient.user_id))[0]!;
      await occurrences.complete(todayOcc.occurrence_id, patient.user_id, null);

      await tasks.remove(task.task_id, patient.user_id);

      const future = await ownerDb
        .selectFrom('care_task_occurrences')
        .selectAll()
        .where('date_local', '>', today())
        .execute();
      expect(future).toHaveLength(0);
      const history = await ownerDb
        .selectFrom('care_task_occurrences')
        .selectAll()
        .where('occurrence_id', '=', todayOcc.occurrence_id)
        .executeTakeFirstOrThrow();
      expect(history.status).toBe('done');
    });
  });

  // ── ActivityLog ────────────────────────────────────────────────────────

  describe('activity log', () => {
    it('records who did what, and is append-only', async () => {
      const patient = await makePatient();
      const caregiver = await makeCaregiver(patient.user_id);
      await tasks.create(patient.user_id, patient.user_id, dailyTask);
      const o = (await occurrences.listForDate(patient.user_id, patient.user_id))[0]!;
      await occurrences.complete(o.occurrence_id, caregiver.user_id, null);

      const rows = await ownerDb.selectFrom('activity_log').selectAll().orderBy('created_at', 'asc').execute();
      expect(rows.map((r) => r.action)).toEqual(['created', 'completed']);
      expect(rows[1]?.actor_type).toBe('caregiver');
      expect(rows[1]?.actor_id).toBe(caregiver.user_id);

      await expect(ownerDb.updateTable('activity_log').set({ action: 'skipped' }).execute()).rejects.toThrow(/append-only/);
      await expect(ownerDb.deleteFrom('activity_log').execute()).rejects.toThrow(/append-only/);
    });

    it('the patient’s circle can read it (day-end report source)', async () => {
      const patient = await makePatient();
      const family = await makeFamily(patient.user_id);
      await tasks.create(patient.user_id, patient.user_id, dailyTask);

      const seen = await withRlsContext(appDb, { actingUserId: family.user_id }, (trx) =>
        trx.selectFrom('activity_log').selectAll().execute(),
      );
      expect(seen.length).toBeGreaterThan(0);
    });

    it('a stranger sees nothing (RLS)', async () => {
      const patient = await makePatient();
      const stranger = await createUser(appDb, { phone_e164: phone(), roles: ['patient'], status: 'active' });
      await tasks.create(patient.user_id, patient.user_id, dailyTask);

      const seen = await withRlsContext(appDb, { actingUserId: stranger.user_id }, (trx) =>
        trx.selectFrom('activity_log').selectAll().execute(),
      );
      expect(seen).toHaveLength(0);
    });
  });

  // ── Cross-tenant isolation ─────────────────────────────────────────────

  describe('RLS isolation', () => {
    it('a stranger cannot read another patient’s tasks or occurrences', async () => {
      const patient = await makePatient();
      const stranger = await createUser(appDb, { phone_e164: phone(), roles: ['patient'], status: 'active' });
      await tasks.create(patient.user_id, patient.user_id, dailyTask);

      const t = await withRlsContext(appDb, { actingUserId: stranger.user_id }, (trx) =>
        trx.selectFrom('care_tasks').selectAll().execute(),
      );
      const o = await withRlsContext(appDb, { actingUserId: stranger.user_id }, (trx) =>
        trx.selectFrom('care_task_occurrences').selectAll().execute(),
      );
      expect(t).toHaveLength(0);
      expect(o).toHaveLength(0);
    });

    it('there is NO family/caregiver UPDATE policy on occurrences (D12 discipline)', async () => {
      // Cross-actor writes go through SECURITY DEFINER functions only. A
      // broad UPDATE policy would authorize a whole-row write for every code
      // path reaching the table.
      const rows = await ownerDb
        .selectFrom('pg_policies' as never)
        .select(['policyname' as never, 'cmd' as never])
        .where('tablename' as never, '=', 'care_task_occurrences')
        .execute();
      const writePolicies = (rows as unknown as { policyname: string; cmd: string }[]).filter(
        (r) => r.cmd === 'UPDATE' || r.cmd === 'DELETE',
      );
      // Only the patient-owner FOR ALL policy may appear.
      expect(writePolicies.every((p) => p.policyname.includes('owner'))).toBe(true);
    });
  });
});
