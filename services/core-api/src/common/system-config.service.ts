import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import {
  FEATURE_FLAG_REGISTRY,
  parseSystemConfigOrDefault,
  systemConfigDefault,
} from '@sinalytix/config';
import type { FeatureFlagKey, SystemConfigKey, SystemConfigValue } from '@sinalytix/config';
import { KYSELY } from './db.module';

/**
 * Runtime reader for `system_config` / `feature_flags` (K10, DEVIATIONS D15
 * item A3). Every runtime constant a service needs comes from here instead
 * of a `const` at the top of a file.
 *
 * **Cache.** Admin PRD §7 kabul kriteri 5: "Config değişikliği ilgili servise
 * ≤30sn'de yansır." A 30-second TTL satisfies that by construction, with no
 * event bus and no invalidation protocol to get wrong. When the Admin phase
 * lands the config-edit endpoint it can additionally publish an invalidate
 * event for instant propagation — but the SLO will already hold without it,
 * which is the point: the guarantee shouldn't depend on a message arriving.
 *
 * **Failure mode is deliberate.** A missing row, a malformed value, or the
 * database being unreachable all resolve to the registry default rather than
 * throwing. A config lookup sits on ordinary request paths (link TTLs, SOS
 * countdowns); making those paths fail because a config row is odd would
 * turn a cosmetic problem into an outage. Divergences are logged once per
 * refresh, not per call.
 *
 * **No RLS context needed.** `system_config`/`feature_flags` have
 * `SELECT USING (true)` (migration 0015) — config is not PHI and every
 * request path may need it. So this reads through the plain pool without
 * `withRlsContext`, which also means it can be called from outside a
 * request (cron, worker) unchanged.
 */
@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);
  private static readonly CACHE_TTL_MS = 30_000;

  private configCache: Map<string, unknown> | null = null;
  private configCacheAt = 0;
  private configRefresh: Promise<Map<string, unknown>> | null = null;

  private flagCache: Map<string, boolean> | null = null;
  private flagCacheAt = 0;
  private flagRefresh: Promise<Map<string, boolean>> | null = null;

  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  /**
   * Reads a typed config value. Falls back to the `@sinalytix/config`
   * registry default whenever the row is missing, malformed or unreadable.
   */
  async get<K extends SystemConfigKey>(key: K): Promise<SystemConfigValue<K>> {
    const rows = await this.loadConfig();
    if (!rows.has(key)) {
      return systemConfigDefault(key);
    }
    const { value, usedDefault } = parseSystemConfigOrDefault(key, rows.get(key));
    if (usedDefault) {
      this.logger.warn(`system_config["${key}"] failed validation; using the registry default.`);
    }
    return value;
  }

  /** Convenience for the common "stored as minutes/hours, needed as ms" shape. */
  async getMs<K extends SystemConfigKey>(key: K, unit: 'sec' | 'min' | 'hour'): Promise<number> {
    const value = await this.get(key);
    if (typeof value !== 'number') {
      throw new Error(`system_config["${key}"] is not numeric; getMs is not applicable`);
    }
    const factor = unit === 'sec' ? 1_000 : unit === 'min' ? 60_000 : 3_600_000;
    return value * factor;
  }

  /**
   * `true` means the flag is ENGAGED. For `ai.kill_switch` that means AI
   * surfaces are OFF — read the direction carefully, it is documented on the
   * registry entry and is intentionally the inverse of the usual convention.
   */
  async isEnabled(key: FeatureFlagKey): Promise<boolean> {
    const rows = await this.loadFlags();
    return rows.get(key) ?? FEATURE_FLAG_REGISTRY[key].default;
  }

  /** Test/admin hook — drops the caches so the next read hits the DB. */
  invalidate(): void {
    this.configCache = null;
    this.flagCache = null;
  }

  // ── loading ────────────────────────────────────────────────────────────
  // Both loaders collapse concurrent refreshes onto one in-flight promise:
  // a burst of requests arriving right after the TTL lapses issues a single
  // query, not one per request.

  private async loadConfig(): Promise<Map<string, unknown>> {
    if (this.configCache && Date.now() - this.configCacheAt < SystemConfigService.CACHE_TTL_MS) {
      return this.configCache;
    }
    this.configRefresh ??= this.db
      .selectFrom('system_config')
      .select(['key', 'value'])
      .execute()
      .then((rows) => {
        const map = new Map<string, unknown>(rows.map((r) => [r.key, r.value]));
        this.configCache = map;
        this.configCacheAt = Date.now();
        return map;
      })
      .catch((err: unknown) => {
        this.logger.error(`system_config read failed; serving registry defaults. ${String(err)}`);
        return this.configCache ?? new Map<string, unknown>();
      })
      .finally(() => {
        this.configRefresh = null;
      });
    return this.configRefresh;
  }

  private async loadFlags(): Promise<Map<string, boolean>> {
    if (this.flagCache && Date.now() - this.flagCacheAt < SystemConfigService.CACHE_TTL_MS) {
      return this.flagCache;
    }
    this.flagRefresh ??= this.db
      .selectFrom('feature_flags')
      .select(['key', 'enabled'])
      .execute()
      .then((rows) => {
        const map = new Map<string, boolean>(rows.map((r) => [r.key, r.enabled]));
        this.flagCache = map;
        this.flagCacheAt = Date.now();
        return map;
      })
      .catch((err: unknown) => {
        this.logger.error(`feature_flags read failed; serving registry defaults. ${String(err)}`);
        return this.flagCache ?? new Map<string, boolean>();
      })
      .finally(() => {
        this.flagRefresh = null;
      });
    return this.flagRefresh;
  }
}
