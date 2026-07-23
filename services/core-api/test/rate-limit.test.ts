/**
 * Rate limiting — Modül 2 §1.5. DEVIATIONS D15 item B6.
 *
 * The assertion that matters most is the LAST one: SOS endpoints must never
 * 429. Everything else here is a quota; that one is a safety property.
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
import { firstValueFrom, of } from 'rxjs';
import { RateLimitInterceptor, isRateLimitExempt } from '../src/common/rate-limit.interceptor';
import { SystemConfigService } from '../src/common/system-config.service';
import { setupTestDatabase, truncateAll } from './setup';

async function inject(
  app: NestFastifyApplication,
  opts: Parameters<ReturnType<NestFastifyApplication['getHttpAdapter']>['getInstance']['inject']>[0],
) {
  return app.getHttpAdapter().getInstance().inject(opts as never);
}

describe('Rate limiting (Modül 2 §1.5)', () => {
  let app: NestFastifyApplication;
  let ownerPool: Pool;
  let ownerDb: Kysely<Database>;
  let appPool: Pool;
  let appDb: Kysely<Database>;
  let redis: Redis;

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
  });

  afterAll(async () => {
    await app.close();
    await ownerPool.end();
    await appPool.end();
    redis.disconnect();
  });

  it('limits the /auth bucket to the configured per-minute quota and returns Retry-After', async () => {
    const limit = await new SystemConfigService(appDb).get('ratelimit.auth_per_min');

    let lastStatus = 0;
    let limited: Awaited<ReturnType<typeof inject>> | null = null;
    for (let i = 0; i < limit + 1; i += 1) {
      const res = await inject(app, {
        method: 'POST',
        url: '/v1/auth/otp/request',
        payload: { phone_e164: `+1416555${String(7000 + i).padStart(4, '0')}` },
      });
      lastStatus = res.statusCode;
      if (res.statusCode === 429) limited = res;
    }

    expect(lastStatus).toBe(429);
    expect(JSON.parse((limited as { body: string }).body).error.code).toBe('RATE_LIMITED');
    const retryAfter = Number((limited as { headers: Record<string, string> }).headers['retry-after']);
    // Time remaining in THIS window, not a flat 60 — a client told to wait a
    // full minute when the window resets in 3s stalls for no reason.
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  it('counts read and write against separate buckets', async () => {
    // The auth bucket is the tightest; exhausting it must not 429 a read.
    const limit = await new SystemConfigService(appDb).get('ratelimit.auth_per_min');
    for (let i = 0; i < limit + 1; i += 1) {
      await inject(app, { method: 'POST', url: '/v1/auth/otp/request', payload: { phone_e164: '+14165557999' } });
    }
    const read = await inject(app, { method: 'GET', url: '/v1/me' });
    // 401 (no token) — the point is that it is NOT 429.
    expect(read.statusCode).not.toBe(429);
  });

  it('is driven by SystemConfig, so a load test can retune it without a redeploy (K11)', async () => {
    await ownerDb
      .updateTable('system_config')
      .set({ value: 2 })
      .where('key', '=', 'ratelimit.auth_per_min')
      .execute();
    try {
      // A fresh service instance picks the new value up immediately; the live
      // one would within its 30s TTL (Admin PRD §7/5).
      const svc = new SystemConfigService(appDb);
      expect(await svc.get('ratelimit.auth_per_min')).toBe(2);
    } finally {
      await ownerDb
        .updateTable('system_config')
        .set({ value: 10 })
        .where('key', '=', 'ratelimit.auth_per_min')
        .execute();
    }
  });

  describe('SOS exemption (§1.5 "asla 429 dönmez")', () => {
    // A rate limiter that can refuse an emergency call is worse than no rate
    // limiter. These endpoints land in Faz 4; the exemption is asserted now so
    // that shipping them cannot quietly bring them under the limiter.
    it('exempts the SOS prefixes even far past every quota', () => {
      for (const path of ['/sos-events', '/sos-events/abc/advance', '/call-attempts']) {
        expect(isRateLimitExempt(path)).toBe(true);
      }
    });

    it('does not accidentally exempt anything else', () => {
      for (const path of ['/me', '/auth/login', '/consents', '/emergency-contacts/x', '/sos', '/callattempts', '/sos-events-summary', '/call-attempts-report']) {
        expect(isRateLimitExempt(path)).toBe(false);
      }
    });
  });

  describe('Redis outage (Reviewer D Medium — fail open)', () => {
    // A rate limiter is an abuse guard, not a correctness mechanism; a Redis
    // blip must NOT 500 the whole non-SOS API. Constructed with stubs so the
    // test doesn't depend on actually killing Redis.
    function makeInterceptor(redisStub: { incr: () => Promise<number>; expire?: () => Promise<number> }) {
      const systemConfig = { get: async () => 60 } as unknown as ConstructorParameters<typeof RateLimitInterceptor>[1];
      return new RateLimitInterceptor(redisStub as unknown as ConstructorParameters<typeof RateLimitInterceptor>[0], systemConfig);
    }

    function ctxFor(url: string) {
      const request = { url, method: 'GET', authContext: { userId: 'u1' } };
      return {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as Parameters<RateLimitInterceptor['intercept']>[0];
    }

    const nextOk = { handle: () => of('ok') } as unknown as Parameters<RateLimitInterceptor['intercept']>[1];

    it('lets the request through when Redis.incr rejects', async () => {
      const interceptor = makeInterceptor({ incr: () => Promise.reject(new Error('ECONNREFUSED')) });
      const result = await firstValueFrom(interceptor.intercept(ctxFor('/v1/me'), nextOk));
      expect(result).toBe('ok');
    });

    it('still short-circuits SOS before Redis is even consulted', async () => {
      let touched = false;
      const interceptor = makeInterceptor({
        incr: () => {
          touched = true;
          return Promise.reject(new Error('down'));
        },
      });
      const result = await firstValueFrom(interceptor.intercept(ctxFor('/v1/sos-events'), nextOk));
      expect(result).toBe('ok');
      expect(touched).toBe(false); // exemption returns before consume()
    });
  });
});


