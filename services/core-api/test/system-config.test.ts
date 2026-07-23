/**
 * Migration 0015 (K9/K10) — the admin surface's schema footprint.
 * DEVIATIONS.md D15 items A1, A2, A3, A4.
 *
 * Everything here runs against the RLS-governed `sinalytix_app` connection
 * (never the owner), because the whole point of the migration's policies is
 * what a non-owner role can and cannot do. Two of these assertions cover
 * privilege-escalation holes that migration 0015 *closes* — they are
 * regression tests for a fix, not documentation of existing behavior.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import { withRlsContext } from '@sinalytix/db';
import type { Pool } from 'pg';
import { SYSTEM_CONFIG_KEYS, systemConfigDefault } from '@sinalytix/config';
import { createUser, setupTestDatabase, truncateAll } from './setup';
import { SystemConfigService } from '../src/common/system-config.service';

describe('Migration 0015 — admin app_context, SystemConfig, FeatureFlag (K9/K10)', () => {
  let ownerPool: Pool;
  let ownerDb: Kysely<Database>;
  let appPool: Pool;
  let appDb: Kysely<Database>;

  beforeAll(async () => {
    ({ ownerPool, ownerDb, appPool, appDb } = await setupTestDatabase());
  });

  beforeEach(async () => {
    await truncateAll(ownerDb);
  });

  afterAll(async () => {
    await ownerPool.end();
    await appPool.end();
  });

  // ── A1 (K9) ────────────────────────────────────────────────────────────

  describe('K9 — `admin` app_context', () => {
    it('accepts an admin session (the CHECK constraint used to reject it outright)', async () => {
      const user = await createUser(appDb, { phone_e164: '+14165559001', roles: ['admin'] });
      const session = await withRlsContext(
        appDb,
        { actingUserId: user.user_id, actingRoles: ['admin'] },
        (trx) =>
          trx
            .insertInto('sessions')
            .values({
              user_id: user.user_id,
              app_context: 'admin',
              platform: 'web',
              max_at: new Date(Date.now() + 8 * 3_600_000),
              idle_at: new Date(Date.now() + 15 * 60_000),
            })
            .returning(['session_id', 'app_context'])
            .executeTakeFirstOrThrow(),
      );
      expect(session.app_context).toBe('admin');
    });

    it('still rejects an app_context outside the five-surface set', async () => {
      const user = await createUser(appDb, { phone_e164: '+14165559002' });
      await expect(
        withRlsContext(appDb, { actingUserId: user.user_id }, (trx) =>
          trx
            .insertInto('sessions')
            .values({
              user_id: user.user_id,
              app_context: 'not_a_surface',
              platform: 'web',
              max_at: new Date(),
              idle_at: new Date(),
            })
            .execute(),
        ),
      ).rejects.toThrow();
    });

    it('accepts an admin-context consent record (0004 had the same narrow CHECK)', async () => {
      const user = await createUser(appDb, { phone_e164: '+14165559003' });
      await expect(
        withRlsContext(appDb, { actingUserId: user.user_id }, (trx) =>
          trx
            .insertInto('consent_records')
            .values({
              user_id: user.user_id,
              app_context: 'admin',
              version: 'tos-1',
              recorded_channel: 'in_app',
              flags: { accept_tos: true },
              consented_at: new Date(),
            })
            .execute(),
        ),
      ).resolves.not.toThrow();
    });
  });

  // ── A2 (K10) ───────────────────────────────────────────────────────────

  describe('K10 — admin_users.admin_role is a checked text[]', () => {
    it('stores several roles on one admin (the column was a single text before)', async () => {
      const admin = await createUser(appDb, { phone_e164: '+14165559010', roles: ['admin'] });
      const row = await withRlsContext(appDb, { actingUserId: admin.user_id, actingRoles: ['admin'] }, (trx) =>
        trx
          .insertInto('admin_users')
          .values({ user_id: admin.user_id, admin_role: ['support', 'compliance'] })
          .returning(['admin_role'])
          .executeTakeFirstOrThrow(),
      );
      expect(row.admin_role).toEqual(['support', 'compliance']);
    });

    it('rejects a role outside the K10 set, and rejects an empty array', async () => {
      const admin = await createUser(appDb, { phone_e164: '+14165559011', roles: ['admin'] });
      const insert = (roles: string[]): Promise<unknown> =>
        withRlsContext(appDb, { actingUserId: admin.user_id, actingRoles: ['admin'] }, (trx) =>
          trx.insertInto('admin_users').values({ user_id: admin.user_id, admin_role: roles }).execute(),
        );
      await expect(insert(['root'])).rejects.toThrow();
      await expect(insert([])).rejects.toThrow();
    });

    it('REGRESSION: a non-admin can no longer self-insert an admin_users row', async () => {
      // The 0002 policy was `FOR ALL USING/WITH CHECK (user_id = acting)`,
      // which let ANY authenticated user name themselves an admin. Inert
      // while no admin surface read the table — a live self-elevation
      // primitive the moment one does.
      const user = await createUser(appDb, { phone_e164: '+14165559012', roles: ['patient'] });
      await expect(
        withRlsContext(appDb, { actingUserId: user.user_id, actingRoles: ['patient'] }, (trx) =>
          trx.insertInto('admin_users').values({ user_id: user.user_id, admin_role: ['superadmin'] }).execute(),
        ),
      ).rejects.toThrow();
    });
  });

  describe('REGRESSION: users.roles/status are not self-writable', () => {
    it('rejects a user granting themselves the admin role', async () => {
      // `users_self_update` (0002) has USING and no WITH CHECK, so Postgres
      // reuses USING as WITH CHECK — the row-level policy cannot express
      // "you may edit yourself EXCEPT these columns". Hence the trigger.
      const user = await createUser(appDb, { phone_e164: '+14165559020', roles: ['patient'] });
      await expect(
        withRlsContext(appDb, { actingUserId: user.user_id, actingRoles: ['patient'] }, (trx) =>
          trx.updateTable('users').set({ roles: ['patient', 'admin'] }).where('user_id', '=', user.user_id).execute(),
        ),
      ).rejects.toThrow(/roles\/status/);
    });

    it('rejects a suspended user reactivating themselves', async () => {
      const user = await createUser(appDb, { phone_e164: '+14165559021', roles: ['patient'], status: 'suspended_soft' });
      await expect(
        withRlsContext(appDb, { actingUserId: user.user_id, actingRoles: ['patient'] }, (trx) =>
          trx.updateTable('users').set({ status: 'active' }).where('user_id', '=', user.user_id).execute(),
        ),
      ).rejects.toThrow(/roles\/status/);
    });

    it('still allows a user to edit their own non-privilege columns', async () => {
      const user = await createUser(appDb, { phone_e164: '+14165559022', roles: ['patient'] });
      await expect(
        withRlsContext(appDb, { actingUserId: user.user_id, actingRoles: ['patient'] }, (trx) =>
          trx.updateTable('users').set({ locale: 'fr' }).where('user_id', '=', user.user_id).execute(),
        ),
      ).resolves.not.toThrow();
    });

    it('allows an admin to change another user’s roles (support/compliance actions)', async () => {
      const admin = await createUser(appDb, { phone_e164: '+14165559023', roles: ['admin'] });
      const target = await createUser(appDb, { phone_e164: '+14165559024', roles: ['patient'] });
      // Owner connection performs the write (there is no admin API surface
      // yet, and `users_self_update` is still self-scoped at the RLS layer) —
      // what's under test here is that the TRIGGER doesn't block an
      // admin-role actor, which is the part the Admin phase depends on.
      await expect(
        withRlsContext(ownerDb, { actingUserId: admin.user_id, actingRoles: ['admin'] }, (trx) =>
          trx.updateTable('users').set({ roles: ['patient', 'family'] }).where('user_id', '=', target.user_id).execute(),
        ),
      ).resolves.not.toThrow();
    });
  });

  // ── A3 (K10) ───────────────────────────────────────────────────────────

  describe('K10 — system_config / feature_flags', () => {
    it('seeds every registry key with its registry default', async () => {
      const rows = await withRlsContext(appDb, {}, (trx) =>
        trx.selectFrom('system_config').select(['key', 'value']).execute(),
      );
      const byKey = new Map(rows.map((r) => [r.key, r.value]));
      for (const key of SYSTEM_CONFIG_KEYS) {
        expect(byKey.get(key)).toEqual(systemConfigDefault(key));
      }
    });

    it('is readable with NO acting user at all (every service path needs config, it holds no PHI)', async () => {
      const rows = await withRlsContext(appDb, {}, (trx) => trx.selectFrom('system_config').selectAll().execute());
      expect(rows.length).toBeGreaterThan(0);
    });

    it('is not writable by a non-admin actor', async () => {
      const user = await createUser(appDb, { phone_e164: '+14165559030', roles: ['patient'] });
      const ctx = { actingUserId: user.user_id, actingRoles: ['patient'] };

      // RLS UPDATE with a failing USING clause matches zero rows rather than
      // erroring, so assert on the row count AND on the value being unchanged.
      const updated = await withRlsContext(appDb, ctx, (trx) =>
        trx
          .updateTable('system_config')
          .set({ value: 999 })
          .where('key', '=', 'approval.expiry_hours')
          .executeTakeFirst(),
      );
      expect(Number(updated.numUpdatedRows)).toBe(0);

      await expect(
        withRlsContext(appDb, ctx, (trx) =>
          trx.insertInto('system_config').values({ key: 'evil.key', value: 1 }).execute(),
        ),
      ).rejects.toThrow();

      const after = await withRlsContext(appDb, {}, (trx) =>
        trx.selectFrom('system_config').select('value').where('key', '=', 'approval.expiry_hours').executeTakeFirst(),
      );
      expect(after?.value).toEqual(48);
    });

    it('seeds ai.kill_switch NOT engaged, so an AI surface stays up if the flag table is empty', async () => {
      const flag = await withRlsContext(appDb, {}, (trx) =>
        trx.selectFrom('feature_flags').selectAll().where('key', '=', 'ai.kill_switch').executeTakeFirstOrThrow(),
      );
      expect(flag.enabled).toBe(false);
      expect(flag.scope).toBe('global');
    });

    it('rejects a feature flag whose scope/scope_value combination is incoherent', async () => {
      const admin = await createUser(appDb, { phone_e164: '+14165559031', roles: ['admin'] });
      const ctx = { actingUserId: admin.user_id, actingRoles: ['admin'] };
      // scope=org with no scope_value: nothing to scope TO.
      await expect(
        withRlsContext(appDb, ctx, (trx) =>
          trx.insertInto('feature_flags').values({ key: 'x.y', enabled: true, scope: 'org' }).execute(),
        ),
      ).rejects.toThrow();
      // scope=global WITH a scope_value: contradictory.
      await expect(
        withRlsContext(appDb, ctx, (trx) =>
          trx
            .insertInto('feature_flags')
            .values({ key: 'x.z', enabled: true, scope: 'global', scope_value: 'org-1' })
            .execute(),
        ),
      ).rejects.toThrow();
    });
  });

  describe('SystemConfigService', () => {
    // These tests mutate `system_config`, which `truncateAll` deliberately
    // does NOT clean (it's migration-seeded reference data). Without a
    // guaranteed restore, a failure mid-test leaks a bad value into every
    // later test AND into the next run — order-dependent flakiness that
    // looks like a product bug. So: restore the whole registry after each.
    afterEach(async () => {
      for (const key of SYSTEM_CONFIG_KEYS) {
        await ownerDb
          .insertInto('system_config')
          .values({ key, value: JSON.stringify(systemConfigDefault(key)) })
          .onConflict((oc) => oc.column('key').doUpdateSet({ value: JSON.stringify(systemConfigDefault(key)) }))
          .execute();
      }
    });

    it('reads the seeded value', async () => {
      const svc = new SystemConfigService(appDb);
      expect(await svc.get('approval.expiry_hours')).toBe(48);
      expect(await svc.get('link.code_ttl_min')).toBe(15);
      expect(await svc.get('shift.alert_hours')).toEqual([24, 36, 48]);
    });

    it('converts to milliseconds for the callers that need a deadline', async () => {
      const svc = new SystemConfigService(appDb);
      expect(await svc.getMs('approval.expiry_hours', 'hour')).toBe(48 * 3_600_000);
      expect(await svc.getMs('link.code_ttl_min', 'min')).toBe(15 * 60_000);
    });

    it('reflects an admin edit within the cache TTL bound, and falls back to the default when the row is gone', async () => {
      const svc = new SystemConfigService(appDb);
      expect(await svc.get('carryover.max_days')).toBe(7);

      await ownerDb.updateTable('system_config').set({ value: 3 }).where('key', '=', 'carryover.max_days').execute();
      svc.invalidate(); // stands in for the ≤30s TTL lapse (Admin PRD §7/5)
      expect(await svc.get('carryover.max_days')).toBe(3);

      // A malformed value must degrade to the shipped default, not throw —
      // a config row must never be able to take a request path down.
      await ownerDb
        .updateTable('system_config')
        .set({ value: JSON.stringify('not-a-number') }) // a bare string isn't valid jsonb input
        .where('key', '=', 'carryover.max_days')
        .execute();
      svc.invalidate();
      expect(await svc.get('carryover.max_days')).toBe(7);

    });

    it('returns the registry default for a key with no row', async () => {
      await ownerDb.deleteFrom('system_config').where('key', '=', 'upload.clinical_mb').execute();
      const svc = new SystemConfigService(appDb);
      expect(await svc.get('upload.clinical_mb')).toBe(25);
    });
  });
});
