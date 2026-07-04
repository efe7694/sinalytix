import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import Redis from 'ioredis';
import { IdempotencyService } from '../src/common/idempotency.service';

// Unit-tests IdempotencyService's Redis-backed caching directly (get/store/
// hashBody). The full request-cycle behavior (IdempotencyInterceptor reading
// the header, short-circuiting via `next.handle()`, asserting a real side
// effect only runs once) gets its first genuine end-to-end exercise in
// Slice 1's mutating endpoints — Slice 0 has none of its own to attach it to
// yet, and a throwaway test-fixture controller would test less than a real one.
describe('IdempotencyService (Module 2 §6.1)', () => {
  let redis: Redis;
  let service: IdempotencyService;

  beforeEach(async () => {
    redis = new Redis(process.env.REDIS_URL as string);
    await redis.flushdb();
    service = new IdempotencyService(redis);
  });

  afterAll(async () => {
    redis.disconnect();
  });

  it('returns null for a key that was never stored', async () => {
    const cached = await service.getCached('user-1', 'POST', '/v1/patients/p1/emergency-contacts', 'key-1');
    expect(cached).toBeNull();
  });

  it('round-trips a stored response, including its body hash', async () => {
    const bodyHash = service.hashBody({ relationship: 'spouse' });
    await service.store('user-1', 'POST', '/v1/patients/p1/emergency-contacts', 'key-1', {
      body: { contact_id: 'ec-1' },
      bodyHash,
    });

    const cached = await service.getCached('user-1', 'POST', '/v1/patients/p1/emergency-contacts', 'key-1');
    expect(cached).toEqual({ body: { contact_id: 'ec-1' }, bodyHash });
  });

  it('produces the same hash for the same body and a different hash for a different body', () => {
    const a = service.hashBody({ code: '123456' });
    const b = service.hashBody({ code: '123456' });
    const c = service.hashBody({ code: '654321' });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('isolates cache entries per (user, method, path) even with the same key', async () => {
    const bodyHash = service.hashBody({});
    await service.store('user-1', 'POST', '/v1/a', 'shared-key', { body: 'a', bodyHash });
    await service.store('user-1', 'POST', '/v1/b', 'shared-key', { body: 'b', bodyHash });
    await service.store('user-2', 'POST', '/v1/a', 'shared-key', { body: 'user2', bodyHash });

    expect((await service.getCached('user-1', 'POST', '/v1/a', 'shared-key'))?.body).toBe('a');
    expect((await service.getCached('user-1', 'POST', '/v1/b', 'shared-key'))?.body).toBe('b');
    expect((await service.getCached('user-2', 'POST', '/v1/a', 'shared-key'))?.body).toBe('user2');
  });

  it('sets a TTL on the stored key (24h retention window, Module 2 §6.1)', async () => {
    const bodyHash = service.hashBody({});
    await service.store('user-1', 'POST', '/v1/a', 'key-ttl', { body: {}, bodyHash });
    const ttl = await redis.ttl('idempotency:user-1:POST:/v1/a:key-ttl');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(24 * 60 * 60);
  });
});
