import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS } from '../common/redis.module';
import { randomOtpCode, sha256Hex } from '../common/hash.util';
import { ProblemException } from '../common/problem.exception';

const CODE_TTL_SECONDS = 5 * 60;
const REQUEST_LIMIT = 5;
const REQUEST_WINDOW_SECONDS = 60 * 60;
const VERIFY_FAIL_LIMIT = 5; // Module 2 §3.1: "5 hatalı deneme → 15 dk soğuma"
const VERIFY_LOCKOUT_SECONDS = 15 * 60;

function codeKey(phoneHash: string): string {
  return `otp:code:${phoneHash}`;
}
function requestCountKey(phoneHash: string): string {
  return `otp:reqcount:${phoneHash}`;
}
function failCountKey(phoneHash: string): string {
  return `otp:failcount:${phoneHash}`;
}
function lockoutKey(phoneHash: string): string {
  return `otp:lockout:${phoneHash}`;
}

@Injectable()
export class OtpService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  /** Always succeeds from the caller's perspective (Module 2 §3.1: response
   * is always 202, no phone-exists enumeration) unless rate-limited. */
  async requestCode(phoneE164: string): Promise<void> {
    const phoneHash = sha256Hex(phoneE164);

    const requests = await this.redis.incr(requestCountKey(phoneHash));
    if (requests === 1) {
      await this.redis.expire(requestCountKey(phoneHash), REQUEST_WINDOW_SECONDS);
    }
    if (requests > REQUEST_LIMIT) {
      throw ProblemException.tooManyRequests('Çok fazla kod isteği. Lütfen daha sonra tekrar deneyin.');
    }

    const code = randomOtpCode();
    await this.redis.set(codeKey(phoneHash), code, 'EX', CODE_TTL_SECONDS);

    // No SMS provider wired yet (deployment-readiness item, same gap the
    // prior backend had) — logging is the local-dev stand-in for delivery.
    // eslint-disable-next-line no-console
    console.log(`[dev-only] OTP for ${phoneE164}: ${code}`);
  }

  async verifyCode(phoneE164: string, code: string): Promise<boolean> {
    const phoneHash = sha256Hex(phoneE164);

    const locked = await this.redis.get(lockoutKey(phoneHash));
    if (locked) {
      throw ProblemException.tooManyRequests('Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.');
    }

    const stored = await this.redis.get(codeKey(phoneHash));
    if (stored && stored === code) {
      await this.redis.del(codeKey(phoneHash), failCountKey(phoneHash));
      return true;
    }

    const fails = await this.redis.incr(failCountKey(phoneHash));
    if (fails === 1) {
      await this.redis.expire(failCountKey(phoneHash), VERIFY_LOCKOUT_SECONDS);
    }
    if (fails >= VERIFY_FAIL_LIMIT) {
      await this.redis.set(lockoutKey(phoneHash), '1', 'EX', VERIFY_LOCKOUT_SECONDS);
    }
    return false;
  }
}
