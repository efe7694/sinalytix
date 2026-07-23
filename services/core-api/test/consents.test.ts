/**
 * `/consents` — Modül 2 §3.2. DEVIATIONS D15 item B4.
 *
 * The table shipped in Faz 0 (migration 0004) with no endpoints at all, so
 * until now nothing in the product could actually record a consent — which
 * is a compliance-load-bearing gap, not a missing convenience: PIPEDA
 * requires versioned, immutable, explicit consent (Uyum Listesi §2).
 */

import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import type { Pool } from 'pg';
import Redis from 'ioredis';
import { AppModule } from '../src/app.module';
import { ApiErrorFilter } from '../src/common/api-error.filter';
import { createUser, setupTestDatabase, truncateAll } from './setup';
import { ConsentsService } from '../src/consents/consents.service';

async function inject(
  app: NestFastifyApplication,
  opts: Parameters<ReturnType<NestFastifyApplication['getHttpAdapter']>['getInstance']['inject']>[0],
) {
  return app.getHttpAdapter().getInstance().inject(opts as never);
}

describe('ConsentRecord endpoints (Modül 2 §3.2)', () => {
  let app: NestFastifyApplication;
  let ownerPool: Pool;
  let ownerDb: Kysely<Database>;
  let appPool: Pool;
  let appDb: Kysely<Database>;
  let redis: Redis;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    ({ ownerPool, ownerDb, appPool, appDb } = await setupTestDatabase());
    redis = new Redis(process.env.REDIS_URL as string);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalFilters(new ApiErrorFilter());
    app.setGlobalPrefix('v1');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  beforeEach(async () => {
    await truncateAll(ownerDb);
    await redis.flushdb();
    ({ token, userId } = await signIn('+14165557701'));
  });

  afterAll(async () => {
    await app.close();
    await ownerPool.end();
    await appPool.end();
    redis.disconnect();
  });

  async function signIn(phone: string): Promise<{ token: string; userId: string }> {
    await inject(app, { method: 'POST', url: '/v1/auth/otp/request', payload: { phone_e164: phone } });
    const key = (await redis.keys('otp:code:*'))[0] as string;
    const code = await redis.get(key);
    const res = await inject(app, {
      method: 'POST',
      url: '/v1/auth/otp/verify',
      payload: { phone_e164: phone, code, app_context: 'patient' },
    });
    const body = JSON.parse(res.body);
    return { token: body.access_token, userId: body.user_id };
  }

  function headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      authorization: `Bearer ${token}`,
      'x-app-context': 'patient',
      'x-idempotency-key': `${Math.random()}`,
      ...extra,
    };
  }

  const validBody = (version = 'tos-2026-07', flags: Record<string, boolean> = { accept_tos: true, accept_privacy: true }) => ({
    app_context: 'patient',
    version,
    recorded_channel: 'in_app',
    flags,
    consented_at: new Date().toISOString(),
  });

  it('records a consent and returns the server timestamp', async () => {
    const res = await inject(app, { method: 'POST', url: '/v1/consents', headers: headers(), payload: validBody() });
    expect(res.statusCode).toBeLessThan(300);
    const body = JSON.parse(res.body);
    expect(body.consent_id).toBeTruthy();
    expect(body.server_recorded_at).toBeTruthy();
  });

  it('hashes the caller IP rather than storing it (Modül 1 §1.6)', async () => {
    await inject(app, { method: 'POST', url: '/v1/consents', headers: headers(), payload: validBody() });
    const row = await ownerDb.selectFrom('consent_records').select('ip_hash').executeTakeFirstOrThrow();
    expect(row.ip_hash).toBeTruthy();
    expect(row.ip_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('derives user_id from the session — a client cannot consent on another user’s behalf', async () => {
    const other = await signIn('+14165557702');
    // Re-authenticate as the first user, then try to name the other one.
    ({ token, userId } = await signIn('+14165557701'));
    await inject(app, {
      method: 'POST',
      url: '/v1/consents',
      headers: headers(),
      payload: { ...validBody(), on_behalf_of_patient_id: other.userId },
    });
    const rows = await ownerDb.selectFrom('consent_records').select('user_id').execute();
    expect(rows.every((r) => r.user_id !== other.userId)).toBe(true);
  });

  it('refuses on-behalf-of recording for a non-clinician (403, C17a)', async () => {
    const other = await signIn('+14165557703');
    ({ token, userId } = await signIn('+14165557701'));
    const res = await inject(app, {
      method: 'POST',
      url: '/v1/consents',
      headers: headers(),
      payload: {
        ...validBody(),
        recorded_channel: 'clinician_recorded',
        on_behalf_of_patient_id: other.userId,
      },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error.code).toBe('PERMISSION_DENIED');
  });

  it('C17a SUCCESS: a clinician records consent for an app-less patient (regression — used to 500 via RETURNING/RLS)', async () => {
    // The on-behalf write sets user_id = the PATIENT, but migration 0004's
    // SELECT policy is user_id = acting (the clinician), and Postgres re-checks
    // SELECT on a RETURNING row → the row (patient-owned) failed it → 500,
    // nothing recorded. Independent review S3-1. Tested at the service level
    // because a clinician session needs HCP email+password auth this suite
    // doesn't set up; the RLS behavior under test is identical.
    const clinician = await createUser(appDb, { phone_e164: '+14165557801', roles: ['clinician'] });
    const patient = await createUser(appDb, { phone_e164: '+14165557802', roles: ['patient'] });
    const svc = new ConsentsService(appDb);

    const result = await svc.create(
      { userId: clinician.user_id, roles: ['clinician'], appContext: 'hcp' },
      {
        app_context: 'hcp',
        version: 'tos-clin-1',
        recorded_channel: 'clinician_recorded',
        flags: { accept_tos: true },
        consented_at: new Date().toISOString(),
        on_behalf_of_patient_id: patient.user_id,
      },
      'deadbeef'.repeat(8),
    );

    expect(result.consent_id).toBeTruthy();
    expect(result.server_recorded_at).toBeTruthy();
    // The record exists and is owned by the PATIENT, not the clinician.
    const rows = await ownerDb
      .selectFrom('consent_records')
      .selectAll()
      .where('consent_id', '=', result.consent_id)
      .execute();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.user_id).toBe(patient.user_id);
    expect(rows[0]?.recorded_channel).toBe('clinician_recorded');
  });

  it('returns the full immutable history, newest first', async () => {
    await inject(app, { method: 'POST', url: '/v1/consents', headers: headers(), payload: validBody('tos-v1') });
    await inject(app, { method: 'POST', url: '/v1/consents', headers: headers(), payload: validBody('tos-v2') });
    const res = await inject(app, { method: 'GET', url: '/v1/consents', headers: headers() });
    const { data } = JSON.parse(res.body);
    expect(data).toHaveLength(2);
    expect(data[0].version).toBe('tos-v2');
    expect(data[1].version).toBe('tos-v1');
  });

  it('never returns another user’s records', async () => {
    await inject(app, { method: 'POST', url: '/v1/consents', headers: headers(), payload: validBody() });
    const other = await signIn('+14165557704');
    const res = await inject(app, {
      method: 'GET',
      url: '/v1/consents',
      headers: { authorization: `Bearer ${other.token}`, 'x-app-context': 'patient' },
    });
    expect(JSON.parse(res.body).data).toHaveLength(0);
  });

  describe('GET /consents/effective', () => {
    it('takes flags from the NEWEST record and does not merge across versions', async () => {
      // The withdrawal case: v1 accepted AI processing, v2 did not. A union
      // would resurrect it — which would mean running AI on a user who
      // explicitly declined it in the version they actually agreed to (B9).
      await inject(app, {
        method: 'POST',
        url: '/v1/consents',
        headers: headers(),
        payload: validBody('tos-v1', { accept_tos: true, ack_ai_processing: true }),
      });
      await inject(app, {
        method: 'POST',
        url: '/v1/consents',
        headers: headers(),
        payload: validBody('tos-v2', { accept_tos: true, ack_ai_processing: false }),
      });
      const res = await inject(app, { method: 'GET', url: '/v1/consents/effective', headers: headers() });
      const { data } = JSON.parse(res.body);
      expect(data).toHaveLength(1);
      expect(data[0].version).toBe('tos-v2');
      expect(data[0].flags.ack_ai_processing).toBe(false);
    });

    it('reports one entry per app_context', async () => {
      await inject(app, { method: 'POST', url: '/v1/consents', headers: headers(), payload: validBody('tos-v1') });
      const res = await inject(app, { method: 'GET', url: '/v1/consents/effective', headers: headers() });
      const { data } = JSON.parse(res.body);
      expect(data.map((d: { app_context: string }) => d.app_context)).toEqual(['patient']);
    });
  });

  describe('append-only surface', () => {
    it.each(['PATCH', 'PUT', 'DELETE'] as const)('%s /consents/{id} → 405 METHOD_NOT_ALLOWED', async (method) => {
      const created = await inject(app, {
        method: 'POST',
        url: '/v1/consents',
        headers: headers(),
        payload: validBody(),
      });
      const { consent_id } = JSON.parse(created.body);
      const res = await inject(app, {
        method,
        url: `/v1/consents/${consent_id}`,
        headers: headers(),
        payload: {},
      });
      // 405, not 404: a 404 reads like a wrong URL and invites the caller to
      // keep hunting for the right one.
      expect(res.statusCode).toBe(405);
      expect(JSON.parse(res.body).error.code).toBe('METHOD_NOT_ALLOWED');
    });

    it('is enforced at the DB layer too, independently of the controller', async () => {
      await inject(app, { method: 'POST', url: '/v1/consents', headers: headers(), payload: validBody() });
      await expect(
        ownerDb.updateTable('consent_records').set({ version: 'tampered' }).execute(),
      ).rejects.toThrow(/append-only/);
      await expect(ownerDb.deleteFrom('consent_records').execute()).rejects.toThrow(/append-only/);
    });
  });
});
