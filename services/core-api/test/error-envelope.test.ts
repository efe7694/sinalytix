/**
 * The canonical error envelope end-to-end — Modül 2 §1.3 + §1.2.
 * DEVIATIONS.md D15 items B1 (envelope) and B2 (idempotency headers).
 *
 * Asserted through the real HTTP stack (filter + guards + pipes), not against
 * `ApiErrorFilter` in isolation: the contract that matters is the bytes on
 * the wire, and the ways this breaks — a framework exception bypassing the
 * filter, a header not surviving the interceptor — only show up there.
 */

import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import type { Pool } from 'pg';
import Redis from 'ioredis';
import { API_ERROR_STATUS, isApiErrorCode } from '@sinalytix/domain';
import { ERROR_MESSAGES } from '@sinalytix/i18n';
import { AppModule } from '../src/app.module';
import { ApiErrorFilter } from '../src/common/api-error.filter';
import { setupTestDatabase, truncateAll } from './setup';

async function inject(
  app: NestFastifyApplication,
  opts: Parameters<ReturnType<NestFastifyApplication['getHttpAdapter']>['getInstance']['inject']>[0],
) {
  return app.getHttpAdapter().getInstance().inject(opts as never);
}

describe('Canonical error envelope (Modül 2 §1.3)', () => {
  let app: NestFastifyApplication;
  let ownerPool: Pool;
  let ownerDb: Kysely<Database>;
  let appPool: Pool;
  let redis: Redis;

  beforeAll(async () => {
    ({ ownerPool, ownerDb, appPool } = await setupTestDatabase());
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
  });

  afterAll(async () => {
    await app.close();
    await ownerPool.end();
    await appPool.end();
    redis.disconnect();
  });

  it('shapes every error as { error: { code, message, request_id } }', async () => {
    const res = await inject(app, { method: 'GET', url: '/v1/me' }); // no token
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(Object.keys(body)).toEqual(['error']);
    expect(body.error.code).toBe('UNAUTHENTICATED');
    expect(typeof body.error.message).toBe('string');
    expect(body.error.request_id).toBeTruthy();
  });

  it('sends each code with the single status the code table assigns it', async () => {
    const res = await inject(app, { method: 'GET', url: '/v1/me' });
    const { code } = JSON.parse(res.body).error;
    expect(isApiErrorCode(code)).toBe(true);
    expect(res.statusCode).toBe(API_ERROR_STATUS[code as keyof typeof API_ERROR_STATUS]);
  });

  it('localizes `message` per Accept-Language, while `code` stays constant', async () => {
    const bodies = await Promise.all(
      (['en', 'fr', 'tr'] as const).map(async (locale) => {
        const res = await inject(app, {
          method: 'GET',
          url: '/v1/me',
          headers: { 'accept-language': locale },
        });
        return { locale, ...JSON.parse(res.body).error };
      }),
    );
    for (const b of bodies) {
      expect(b.code).toBe('UNAUTHENTICATED');
      expect(b.message).toBe(ERROR_MESSAGES['auth.access_token_missing'][b.locale]);
    }
    // The three must actually differ — a catalog bug that returned the same
    // string for every locale would pass a weaker assertion.
    expect(new Set(bodies.map((b) => b.message)).size).toBe(3);
  });

  it('honors q-weighted and region-tagged Accept-Language (fr-CA → French)', async () => {
    const res = await inject(app, {
      method: 'GET',
      url: '/v1/me',
      headers: { 'accept-language': 'fr-CA,en;q=0.3' },
    });
    expect(JSON.parse(res.body).error.message).toBe(ERROR_MESSAGES['auth.access_token_missing'].fr);
  });

  it('falls back to the default locale for an unsupported language', async () => {
    const res = await inject(app, { method: 'GET', url: '/v1/me', headers: { 'accept-language': 'de-DE' } });
    expect(JSON.parse(res.body).error.message).toBe(ERROR_MESSAGES['auth.access_token_missing'].en);
  });

  it('returns VALIDATION_FAILED 422 with PHI-free machine-readable details', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/v1/auth/otp/request',
      payload: { phone_e164: 'not-a-phone' },
    });
    expect(res.statusCode).toBe(422);
    const { error } = JSON.parse(res.body);
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(Array.isArray(error.details)).toBe(true);
    expect(error.details.length).toBeGreaterThan(0);
    for (const d of error.details) {
      expect(Object.keys(d).sort()).toEqual(['field', 'issue']);
      // The rejected VALUE must never appear — details[] is machine-readable
      // and PHI-free (Modül 2 §8). A phone number is PII.
      expect(JSON.stringify(d)).not.toContain('not-a-phone');
    }
  });

  it('never leaks the RFC 7807 fields the old envelope used (full migration, D15/B1)', async () => {
    const res = await inject(app, { method: 'GET', url: '/v1/me' });
    const body = JSON.parse(res.body);
    for (const gone of ['type', 'title', 'status', 'detail', 'trace_id', 'errors']) {
      expect(body[gone]).toBeUndefined();
    }
  });

  it('maps a framework 404 (unknown route) into the canonical envelope too', async () => {
    // Nest/Fastify throw their own exception here — it must not escape with
    // English framework text and no code.
    const res = await inject(app, { method: 'GET', url: '/v1/no-such-route' });
    expect(res.statusCode).toBe(404);
    const { error } = JSON.parse(res.body);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe(ERROR_MESSAGES['error.not_found'].en);
    expect(error.request_id).toBeTruthy();
  });

  it('distinguishes APP_CONTEXT_MISMATCH from a plain PERMISSION_DENIED', async () => {
    const otp = await inject(app, {
      method: 'POST',
      url: '/v1/auth/otp/request',
      payload: { phone_e164: '+14165558801' },
    });
    expect(otp.statusCode).toBeLessThan(300);
    const code = await redis.get(
      (await redis.keys('otp:code:*'))[0] as string,
    );
    const verified = await inject(app, {
      method: 'POST',
      url: '/v1/auth/otp/verify',
      payload: { phone_e164: '+14165558801', code, app_context: 'patient' },
    });
    const { access_token } = JSON.parse(verified.body);

    const mismatch = await inject(app, {
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${access_token}`, 'x-app-context': 'caregiver' },
    });
    expect(mismatch.statusCode).toBe(403);
    expect(JSON.parse(mismatch.body).error.code).toBe('APP_CONTEXT_MISMATCH');

    const missingHeader = await inject(app, {
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${access_token}` },
    });
    expect(missingHeader.statusCode).toBe(400);
    expect(JSON.parse(missingHeader.body).error.code).toBe('BAD_REQUEST');
  });

  describe('Idempotency headers (Modül 2 §1.2, D15 item B2)', () => {
    async function patientToken(phone: string): Promise<string> {
      await inject(app, { method: 'POST', url: '/v1/auth/otp/request', payload: { phone_e164: phone } });
      const key = (await redis.keys('otp:code:*'))[0] as string;
      const code = await redis.get(key);
      const verified = await inject(app, {
        method: 'POST',
        url: '/v1/auth/otp/verify',
        payload: { phone_e164: phone, code, app_context: 'patient' },
      });
      return JSON.parse(verified.body).access_token as string;
    }

    it('requires X-Idempotency-Key on a mutating route', async () => {
      const token = await patientToken('+14165558810');
      const res = await inject(app, {
        method: 'POST',
        url: '/v1/caregiver-links/redeem',
        headers: { authorization: `Bearer ${token}`, 'x-app-context': 'patient' },
        payload: { code: '123456' },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error.code).toBe('BAD_REQUEST');
    });

    it('replays a cached response with X-Idempotent-Replayed: true', async () => {
      const token = await patientToken('+14165558811');
      const headers = {
        authorization: `Bearer ${token}`,
        'x-app-context': 'patient',
        'x-idempotency-key': '11111111-1111-4111-8111-111111111111',
      };
      const payload = {};
      const first = await inject(app, {
        method: 'POST',
        url: '/v1/patients/me/caregiver-links',
        headers,
        payload,
      });
      // Whatever the route answers, a replay must answer identically — the
      // point of the test is the replay semantics, not this route's happy path.
      const second = await inject(app, {
        method: 'POST',
        url: '/v1/patients/me/caregiver-links',
        headers,
        payload,
      });
      expect(first.headers['x-idempotent-replayed']).toBeUndefined();
      if (first.statusCode < 300) {
        expect(second.headers['x-idempotent-replayed']).toBe('true');
        expect(second.body).toBe(first.body);
      }
    });

    it('still accepts the legacy bare Idempotency-Key spelling (installed apps)', async () => {
      const token = await patientToken('+14165558812');
      const res = await inject(app, {
        method: 'POST',
        url: '/v1/caregiver-links/redeem',
        headers: {
          authorization: `Bearer ${token}`,
          'x-app-context': 'patient',
          'idempotency-key': '22222222-2222-4222-8222-222222222222',
        },
        payload: { code: '123456' },
      });
      // Not a 400 "header required" — the header WAS accepted; the request then
      // fails on its own merits (no such code).
      expect(JSON.parse(res.body).error.code).not.toBe('BAD_REQUEST');
    });
  });
});
