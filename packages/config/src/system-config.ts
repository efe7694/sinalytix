/**
 * SystemConfig key registry — K10 / Admin Panel PRD A7.
 *
 * K10 is explicit: "runtime sabitler (SOS pencereleri, K3 saatleri, 48s
 * onay, carry-over 7g, yükleme limitleri) `SystemConfig`'ten okunur" — they
 * are NOT to be compiled into services. This file is the single typed
 * registry every service shares: it defines each key's value schema, its
 * default, and whether changing it needs the two-person rule.
 *
 * This package is deliberately DB-free (same discipline as
 * `@sinalytix/policy-engine`): it holds the contract and the defaults, and
 * the runtime reader (`SystemConfigService` in core-api) is what talks to
 * Postgres. That keeps the registry importable from anywhere — worker, cron,
 * rt-gateway, tests — without dragging a database client along.
 *
 * The registry defaults and the `system_config` seed rows (migration 0015)
 * must agree; `system-config.test.ts` asserts that against the migration
 * file so the two can't drift.
 */

import { z } from 'zod';

const positiveInt = z.number().int().positive();

export interface SystemConfigKeyDefinition<T> {
  /** Runtime validator. Also mirrored into `system_config.value_schema` for
   * the admin UI's editor; this zod schema is the authoritative one. */
  readonly schema: z.ZodType<T>;
  /** Used when the DB row is missing (fresh environment, seed not yet run,
   * or a key added in code ahead of its migration). A service must always
   * start with correct behavior, never with `undefined`. */
  readonly default: T;
  /** Admin PRD A7: security-relevant keys (`sos.*`) may only be changed via
   * the two-person rule. Enforced in the Admin phase's config-edit endpoint;
   * declared here so the rule lives with the key, not in the UI. */
  readonly requiresSecondApproval: boolean;
  readonly description: string;
}

/**
 * The V0 key set, verbatim from Admin Panel PRD A7.
 *
 * Two values A7 lists without a number: `ai.daily_cost_cap_user` and
 * `ai.daily_cost_cap_org`. Module 3 §12.4 gives the org default (50 USD/day);
 * the per-user cap is not specified anywhere in the set, so 5 USD/day is a
 * placeholder default — no AI surface reads it before Faz 6, and it is an
 * ops-tunable key precisely so this guess costs nothing to correct.
 */
export const SYSTEM_CONFIG_REGISTRY = {
  // ── SOS (Sözlük §6, SOS UX Spec) ────────────────────────────────────────
  'sos.freshness_window_minutes': {
    schema: positiveInt,
    default: 240,
    requiresSecondApproval: true,
    description: "Aile SOS banner'ının görünür kaldığı süre (A13).",
  },
  'sos.phase1_cancel_sec': {
    schema: positiveInt,
    default: 10,
    requiresSecondApproval: true,
    description: 'Faz-1 (aile araması) öncesi görünür iptal penceresi — SOS UX S1.',
  },
  'sos.phase2_cancel_sec': {
    schema: positiveInt,
    default: 30,
    requiresSecondApproval: true,
    description: 'Faz-2 (911) öncesi görünür iptal penceresi — SOS UX S3.',
  },

  // ── Vardiya (K3) ────────────────────────────────────────────────────────
  'shift.alert_hours': {
    schema: z.array(positiveInt).length(3),
    default: [24, 36, 48],
    requiresSecondApproval: false,
    description: 'K3 vardiya kapanış zinciri: uyarı → ikinci uyarı → system_timeout.',
  },

  // ── Onay kuyruğu (K4) ───────────────────────────────────────────────────
  'approval.expiry_hours': {
    schema: positiveInt,
    default: 48,
    requiresSecondApproval: false,
    description: 'ApprovalRequest süresi; dolduğunda otomatik red (K4).',
  },
  'approval.reminder_hours': {
    schema: positiveInt,
    default: 24,
    requiresSecondApproval: false,
    description: 'Bekleyen onay için hatırlatma bildirimi eşiği (K4).',
  },

  // ── Görev motoru (K7) ───────────────────────────────────────────────────
  'carryover.max_days': {
    schema: positiveInt,
    default: 7,
    requiresSecondApproval: false,
    description: 'Occurrence carry-over zinciri tavanı; sonrasında otomatik skipped.',
  },

  // ── Link kodları (B4) ───────────────────────────────────────────────────
  'link.code_ttl_min': {
    schema: positiveInt,
    default: 15,
    requiresSecondApproval: false,
    description: 'Aile/bakıcı link kodunun geçerlilik süresi (dakika).',
  },

  // ── Yükleme limitleri (B10) ─────────────────────────────────────────────
  'upload.credential_mb': {
    schema: positiveInt,
    default: 10,
    requiresSecondApproval: false,
    description: 'HCP kredensiyel belgesi üst sınırı (MB) — B10 / HCP Doc 1.',
  },
  'upload.clinical_mb': {
    schema: positiveInt,
    default: 25,
    requiresSecondApproval: false,
    description: 'Klinik belge üst sınırı (MB) — B10 / HCP Doc 5.',
  },

  // ── AI maliyet tavanları (Modül 3 §12.4, Modül 4 §6) ────────────────────
  'ai.daily_cost_cap_user': {
    schema: positiveInt,
    default: 5,
    requiresSecondApproval: false,
    description: 'Kullanıcı başına günlük AI maliyet tavanı (USD). Yer tutucu — set bir değer vermiyor.',
  },
  'ai.daily_cost_cap_org': {
    schema: positiveInt,
    default: 50,
    requiresSecondApproval: false,
    description: 'Org başına günlük AI maliyet tavanı (USD) — Modül 3 §12.4.',
  },
} as const satisfies Record<string, SystemConfigKeyDefinition<unknown>>;

export type SystemConfigKey = keyof typeof SYSTEM_CONFIG_REGISTRY;

/** The value type of a given key, derived from its registry default. */
export type SystemConfigValue<K extends SystemConfigKey> = (typeof SYSTEM_CONFIG_REGISTRY)[K]['default'];

export const SYSTEM_CONFIG_KEYS = Object.keys(SYSTEM_CONFIG_REGISTRY) as SystemConfigKey[];

export function isSystemConfigKey(key: string): key is SystemConfigKey {
  return Object.prototype.hasOwnProperty.call(SYSTEM_CONFIG_REGISTRY, key);
}

/**
 * Validates a raw (jsonb-decoded) value against its key's schema. Returns
 * the registry default on failure rather than throwing: a malformed config
 * row must never take a service down — it degrades to the shipped default
 * and the caller logs it. A *write* path (admin config-edit) should call
 * `parseSystemConfigStrict` instead, so bad input is rejected at the door.
 */
export function parseSystemConfigOrDefault<K extends SystemConfigKey>(
  key: K,
  raw: unknown,
): { value: SystemConfigValue<K>; usedDefault: boolean } {
  const def = SYSTEM_CONFIG_REGISTRY[key] as SystemConfigKeyDefinition<SystemConfigValue<K>>;
  const parsed = def.schema.safeParse(raw);
  if (!parsed.success) {
    return { value: def.default, usedDefault: true };
  }
  return { value: parsed.data, usedDefault: false };
}

/** Throwing variant for write paths — see `parseSystemConfigOrDefault`. */
export function parseSystemConfigStrict<K extends SystemConfigKey>(key: K, raw: unknown): SystemConfigValue<K> {
  const def = SYSTEM_CONFIG_REGISTRY[key] as SystemConfigKeyDefinition<SystemConfigValue<K>>;
  return def.schema.parse(raw);
}

export function systemConfigDefault<K extends SystemConfigKey>(key: K): SystemConfigValue<K> {
  return (SYSTEM_CONFIG_REGISTRY[key] as SystemConfigKeyDefinition<SystemConfigValue<K>>).default;
}

export function requiresSecondApproval(key: SystemConfigKey): boolean {
  return SYSTEM_CONFIG_REGISTRY[key].requiresSecondApproval;
}
