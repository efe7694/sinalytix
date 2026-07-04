import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import { withRlsContext } from '@sinalytix/db';
import type { Pool } from 'pg';
import { createUser, setupTestDatabase, truncateAll } from './setup';

describe('RLS cross-tenant isolation (Module 1 §11 — no session vars set → RLS blocks by default)', () => {
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

  it('a request with no acting_org_id sees zero organizations, even though rows exist', async () => {
    // Org creation has no public endpoint in Faz 0 (C17b: Sinalytix-internal
    // provisioning) — seeded via the owner connection, same as a real
    // provisioning script would use.
    await ownerDb
      .insertInto('organizations')
      .values([
        { type: 'clinic', name: 'Org A Clinic' },
        { type: 'clinic', name: 'Org B Clinic' },
      ])
      .execute();

    // Real app-role connection, no session vars set at all — the exact
    // "unauthorized/absent context" shape a buggy request handler could produce.
    const rows = await withRlsContext(appDb, {}, (trx) => trx.selectFrom('organizations').selectAll().execute());
    expect(rows).toHaveLength(0);
  });

  it("org A's practitioner cannot see org B's organization or practitioner_roles (varlık-sızdırmaz: 0 rows, not an error)", async () => {
    const orgA = await ownerDb.insertInto('organizations').values({ type: 'clinic', name: 'Org A' }).returning(['org_id']).executeTakeFirstOrThrow();
    const orgB = await ownerDb.insertInto('organizations').values({ type: 'clinic', name: 'Org B' }).returning(['org_id']).executeTakeFirstOrThrow();

    const userA = await createUser(appDb, { email: 'clinician-a@example.com', roles: ['clinician'] });
    const userB = await createUser(appDb, { email: 'clinician-b@example.com', roles: ['clinician'] });

    await withRlsContext(appDb, { actingUserId: userA.user_id }, (trx) =>
      trx.insertInto('practitioner_roles').values({
        user_id: userA.user_id,
        org_id: orgA.org_id,
        discipline_code: 'family_medicine',
        province_code: 'ON',
      }).execute(),
    );
    await withRlsContext(appDb, { actingUserId: userB.user_id }, (trx) =>
      trx.insertInto('practitioner_roles').values({
        user_id: userB.user_id,
        org_id: orgB.org_id,
        discipline_code: 'family_medicine',
        province_code: 'ON',
      }).execute(),
    );

    // Org A's acting context: acting_org_id = orgA, acting_user_id = userA.
    const visibleOrgs = await withRlsContext(
      appDb,
      { actingUserId: userA.user_id, actingOrgId: orgA.org_id },
      (trx) => trx.selectFrom('organizations').selectAll().execute(),
    );
    expect(visibleOrgs.map((o) => o.org_id)).toEqual([orgA.org_id]);
    expect(visibleOrgs.map((o) => o.org_id)).not.toContain(orgB.org_id);

    const visibleRoles = await withRlsContext(
      appDb,
      { actingUserId: userA.user_id, actingOrgId: orgA.org_id },
      (trx) => trx.selectFrom('practitioner_roles').selectAll().execute(),
    );
    expect(visibleRoles).toHaveLength(1);
    expect(visibleRoles[0]?.org_id).toBe(orgA.org_id);
  });

  it("user A cannot see user B's session rows", async () => {
    const userA = await createUser(appDb, { phone_e164: '+14165550001', roles: ['patient'] });
    const userB = await createUser(appDb, { phone_e164: '+14165550002', roles: ['patient'] });

    await withRlsContext(appDb, { actingUserId: userA.user_id }, (trx) =>
      trx.insertInto('sessions').values({
        user_id: userA.user_id,
        app_context: 'patient',
        platform: 'mobile_ios',
        max_at: new Date(Date.now() + 1000 * 60 * 60),
        idle_at: new Date(Date.now() + 1000 * 60 * 60),
      }).execute(),
    );
    await withRlsContext(appDb, { actingUserId: userB.user_id }, (trx) =>
      trx.insertInto('sessions').values({
        user_id: userB.user_id,
        app_context: 'patient',
        platform: 'mobile_ios',
        max_at: new Date(Date.now() + 1000 * 60 * 60),
        idle_at: new Date(Date.now() + 1000 * 60 * 60),
      }).execute(),
    );

    const asUserA = await withRlsContext(appDb, { actingUserId: userA.user_id }, (trx) => trx.selectFrom('sessions').selectAll().execute());
    expect(asUserA).toHaveLength(1);
    expect(asUserA[0]?.user_id).toBe(userA.user_id);
  });
});
