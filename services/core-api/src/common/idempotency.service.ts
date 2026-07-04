import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS } from './redis.module';
import { sha256Hex } from './hash.util';

/** Module 2 §6.1: same key retained 24h, same key+body replays without
 * re-executing side effects, same key+different body → 409. */
const TTL_SECONDS = 24 * 60 * 60;

export interface CachedIdempotentResponse {
  status: number;
  body: unknown;
  bodyHash: string;
}

function redisKey(userId: string, method: string, path: string, idempotencyKey: string): string {
  return `idempotency:${userId}:${method}:${path}:${idempotencyKey}`;
}

@Injectable()
export class IdempotencyService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async getCached(userId: string, method: string, path: string, idempotencyKey: string): Promise<CachedIdempotentResponse | null> {
    const raw = await this.redis.get(redisKey(userId, method, path, idempotencyKey));
    if (!raw) return null;
    return JSON.parse(raw) as CachedIdempotentResponse;
  }

  async store(
    userId: string,
    method: string,
    path: string,
    idempotencyKey: string,
    response: CachedIdempotentResponse,
  ): Promise<void> {
    await this.redis.set(
      redisKey(userId, method, path, idempotencyKey),
      JSON.stringify(response),
      'EX',
      TTL_SECONDS,
    );
  }

  hashBody(body: unknown): string {
    return sha256Hex(JSON.stringify(body ?? {}));
  }
}
