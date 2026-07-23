import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type Redis from 'ioredis';
import { Observable, from, switchMap } from 'rxjs';
import { REDIS } from './redis.module';
import { SystemConfigService } from './system-config.service';
import { ApiException } from './api.exception';
import { sha256Hex } from './hash.util';

/**
 * Per-caller request quotas — Modül 2 §1.5. DEVIATIONS D15 item B6.
 *
 * Before this, core-api had only two purpose-built limiters (OTP requests,
 * link-code redeem attempts). Those protect specific guessable secrets; they
 * do nothing about a client hammering any other endpoint.
 *
 * ## The SOS exemption is the load-bearing part
 *
 * §1.5: "SOS uçları **muaf** (asla 429 dönmez; kötüye kullanım analizi
 * asenkron)." A rate limiter that can refuse an emergency call is worse than
 * no rate limiter, so the exemption is checked FIRST — before any Redis
 * round-trip, so a Redis outage cannot degrade it either. The prefixes are
 * listed now even though the SOS endpoints land in Faz 4: a limiter that
 * silently starts covering `/sos-events` the day it ships would be a very
 * quiet, very bad regression.
 *
 * ## Interceptor, not a guard
 *
 * Nest runs global guards BEFORE route guards, so a guard here would not yet
 * see `request.authContext` and would have to key everything by IP — which
 * would let one user behind a shared NAT exhaust everyone else's quota, and
 * would let a single user bypass their own quota by switching networks.
 * Interceptors run after guards, so authenticated traffic is keyed by user
 * id and only genuinely-anonymous traffic (the `/auth` endpoints, which have
 * their own tighter bucket) falls back to a hashed IP.
 *
 * ## Fixed window, deliberately
 *
 * A one-minute `INCR` + `EXPIRE` allows a 2× burst across a window boundary.
 * That is an acceptable, well-understood cost here: these limits exist to
 * bound abuse and runaway clients, not to shape traffic precisely, and a
 * sliding-window implementation costs a sorted set per caller per endpoint
 * class. Documented so the boundary burst is a known property, not a
 * surprise during load testing (where K11 says these numbers get calibrated
 * anyway — via `SystemConfig`, so tuning needs no redeploy).
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  /** §1.5 — never rate limited. Prefix-matched against the path after the
   * `/v1` global prefix. */
  private static readonly EXEMPT_PREFIXES = ['/sos-events', '/call-attempts'];
  private static readonly WINDOW_SECONDS = 60;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly systemConfig: SystemConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const path = stripVersionPrefix(request.url);

    if (RateLimitInterceptor.EXEMPT_PREFIXES.some((p) => path.startsWith(p))) {
      return next.handle();
    }

    const bucket = classify(path, request.method);
    return from(this.consume(request, bucket)).pipe(switchMap(() => next.handle()));
  }

  private async consume(request: FastifyRequest, bucket: Bucket): Promise<void> {
    const limit = await this.systemConfig.get(LIMIT_KEY[bucket]);
    const subject = this.subjectFor(request);
    const window = Math.floor(Date.now() / 1000 / RateLimitInterceptor.WINDOW_SECONDS);
    const key = `ratelimit:${bucket}:${subject}:${window}`;

    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, RateLimitInterceptor.WINDOW_SECONDS);
    }
    if (count > limit) {
      // Retry-After is the time left in THIS window, not a flat 60 — telling a
      // client to wait a full minute when the window resets in 3 seconds turns
      // a small overshoot into a long stall.
      const elapsed = Math.floor(Date.now() / 1000) % RateLimitInterceptor.WINDOW_SECONDS;
      throw ApiException.rateLimited('error.rate_limited', RateLimitInterceptor.WINDOW_SECONDS - elapsed);
    }
  }

  /**
   * Authenticated traffic is keyed by user id, anonymous traffic by hashed
   * IP. The IP is hashed rather than stored raw for the same reason it is
   * everywhere else (Modül 1 §1.6) — a Redis key is still a place data
   * lives, and a key-space dump should not be a list of user IP addresses.
   */
  private subjectFor(request: FastifyRequest): string {
    const userId = request.authContext?.userId;
    if (userId) return `u:${userId}`;
    return `i:${request.ip ? sha256Hex(request.ip) : 'unknown'}`;
  }
}

type Bucket = 'read' | 'write' | 'auth';

const LIMIT_KEY = {
  read: 'ratelimit.read_per_min',
  write: 'ratelimit.write_per_min',
  auth: 'ratelimit.auth_per_min',
} as const;

function stripVersionPrefix(url: string): string {
  const path = url.split('?')[0] ?? '';
  return path.startsWith('/v1') ? path.slice(3) : path;
}

/** §1.5's three buckets. `/auth` is its own — and the tightest — because
 * those endpoints are where credential-guessing happens, and because they are
 * the ones an unauthenticated caller can reach at all. */
function classify(path: string, method: string): Bucket {
  if (path.startsWith('/auth')) return 'auth';
  return method === 'GET' || method === 'HEAD' ? 'read' : 'write';
}
