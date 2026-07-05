import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS } from './redis.module';
import { ProblemException } from './problem.exception';

const FAIL_LIMIT = 5;
const LOCKOUT_SECONDS = 15 * 60;

/**
 * Shared "5 wrong codes → 15-minute lockout" limiter for the code-redeem
 * flows (family-link Slice 3, caregiver-link Slice 4, and any future one).
 * Keyed by (namespace, actingUserId) so each redeem domain gets its own
 * isolated bucket — a caregiver burning through caregiver-code guesses must
 * not lock the same person out of family-code redeems, and vice versa (same
 * trust-domain-isolation reasoning as otp vs ec-verify Redis namespaces).
 *
 * Extracted from family-links.service.ts's inline copy during Slice 4 (the
 * "reuse, don't reinvent" step) — behavior is identical.
 */
@Injectable()
export class RedeemRateLimiter {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  private failKey(namespace: string, userId: string): string {
    return `${namespace}-redeem:failcount:${userId}`;
  }
  private lockKey(namespace: string, userId: string): string {
    return `${namespace}-redeem:lockout:${userId}`;
  }

  /** Call at the top of a redeem — throws 429 if the actor is currently
   * locked out, so a locked actor can't even learn whether a code is valid. */
  async assertNotLockedOut(namespace: string, userId: string): Promise<void> {
    if (await this.redis.get(this.lockKey(namespace, userId))) {
      throw ProblemException.tooManyRequests('Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.', LOCKOUT_SECONDS);
    }
  }

  /**
   * Records one failed attempt and ALWAYS throws — a 429 the moment this
   * call crosses the 5-fail threshold (setting the lockout), otherwise the
   * generic anti-enumeration 404 (identical whether the code was wrong,
   * expired, or already redeemed — never reveals which).
   */
  async recordFailureAndThrow(namespace: string, userId: string): Promise<never> {
    const fails = await this.redis.incr(this.failKey(namespace, userId));
    if (fails === 1) {
      await this.redis.expire(this.failKey(namespace, userId), LOCKOUT_SECONDS);
    }
    if (fails >= FAIL_LIMIT) {
      await this.redis.set(this.lockKey(namespace, userId), '1', 'EX', LOCKOUT_SECONDS);
      throw ProblemException.tooManyRequests('Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.', LOCKOUT_SECONDS);
    }
    throw ProblemException.notFound('Kod geçersiz veya süresi dolmuş.');
  }
}
