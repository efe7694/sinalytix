/**
 * The registry (code default) and the migration seeds (DB default) are two
 * copies of the same numbers, and the whole point of K10 is that services
 * read the DB one. If they drift, a service silently behaves differently
 * depending on whether its `system_config` row loaded — the worst kind of
 * bug to debug. So the test reads the actual migration file and diffs it
 * against the registry, rather than asserting a hand-written duplicate.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SYSTEM_CONFIG_KEYS,
  SYSTEM_CONFIG_REGISTRY,
  isSystemConfigKey,
  parseSystemConfigOrDefault,
  parseSystemConfigStrict,
  requiresSecondApproval,
} from './system-config';
import { FEATURE_FLAG_KEYS, featureFlagDefault } from './feature-flags';
import { SESSION_POLICY, sessionPolicyFor } from './session-policy';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../db/migrations');

/** Every migration, concatenated. Scanning the whole directory rather than
 * one named file matters: a key seeded by a LATER migration (0018 added the
 * rate-limit keys) would otherwise silently drop out of the drift check. */
const MIGRATION = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.js'))
  .sort()
  .map((f) => readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8'))
  .join('\n');

/** Parses the `INSERT INTO system_config ... VALUES (...)` seed block into
 * {key: {value, requiresSecondApproval}}. Intentionally a dumb line-regex
 * over the real file: a fancier parser would be one more thing that can be
 * wrong in a way the test can't see. */
function parseSeed(): Record<string, { value: unknown; requiresSecondApproval: boolean }> {
  // Several migrations may each carry an INSERT block; take them all.
  const blocks = MIGRATION.split('INSERT INTO system_config').slice(1);
  const rows = blocks.flatMap((block) => [
    ...block.matchAll(/\(\s*'([\w.]+)'\s*,\s*'([^']+)'::jsonb\s*,\s*(true|false)\s*\)/g),
  ]);
  return Object.fromEntries(
    rows.map((m) => [m[1] as string, { value: JSON.parse(m[2] as string), requiresSecondApproval: m[3] === 'true' }]),
  );
}

describe('SystemConfig registry ↔ migration seeds', () => {
  const seed = parseSeed();

  it('parses a non-empty seed block (guards the regex itself)', () => {
    expect(Object.keys(seed).length).toBeGreaterThan(0);
  });

  it('seeds exactly the registry key set — no extra, no missing', () => {
    expect(Object.keys(seed).sort()).toEqual([...SYSTEM_CONFIG_KEYS].sort());
  });

  it.each(SYSTEM_CONFIG_KEYS)('%s: seeded value equals the code default', (key) => {
    expect(seed[key]?.value).toEqual(SYSTEM_CONFIG_REGISTRY[key].default);
  });

  it.each(SYSTEM_CONFIG_KEYS)('%s: seeded requires_second_approval matches the registry', (key) => {
    expect(seed[key]?.requiresSecondApproval).toBe(requiresSecondApproval(key));
  });

  it('every default satisfies its own schema', () => {
    for (const key of SYSTEM_CONFIG_KEYS) {
      expect(() => parseSystemConfigStrict(key, SYSTEM_CONFIG_REGISTRY[key].default)).not.toThrow();
    }
  });

  it('marks every sos.* key as two-person (Admin PRD A7) and nothing else', () => {
    const twoPerson = SYSTEM_CONFIG_KEYS.filter(requiresSecondApproval);
    expect(twoPerson.sort()).toEqual(
      ['sos.freshness_window_minutes', 'sos.phase1_cancel_sec', 'sos.phase2_cancel_sec'].sort(),
    );
  });
});

describe('parseSystemConfigOrDefault', () => {
  it('returns the stored value when it validates', () => {
    expect(parseSystemConfigOrDefault('approval.expiry_hours', 72)).toEqual({ value: 72, usedDefault: false });
  });

  it('falls back to the default (never throws) on a malformed row', () => {
    // A malformed config row must degrade to the shipped default, not take
    // the service down — see the doc comment on the function.
    for (const bad of [null, 'nope', -1, 0, 1.5, {}, []]) {
      expect(parseSystemConfigOrDefault('approval.expiry_hours', bad)).toEqual({ value: 48, usedDefault: true });
    }
  });

  it('validates array-valued keys element-wise and by length', () => {
    expect(parseSystemConfigOrDefault('shift.alert_hours', [12, 24, 36]).value).toEqual([12, 24, 36]);
    expect(parseSystemConfigOrDefault('shift.alert_hours', [24, 36]).usedDefault).toBe(true);
    expect(parseSystemConfigOrDefault('shift.alert_hours', [24, 36, 'x']).usedDefault).toBe(true);
  });
});

describe('parseSystemConfigStrict', () => {
  it('throws on invalid input (write paths reject at the door)', () => {
    expect(() => parseSystemConfigStrict('link.code_ttl_min', 0)).toThrow();
    expect(() => parseSystemConfigStrict('link.code_ttl_min', 15)).not.toThrow();
  });
});

describe('isSystemConfigKey', () => {
  it('rejects unknown keys and inherited Object properties', () => {
    expect(isSystemConfigKey('approval.expiry_hours')).toBe(true);
    expect(isSystemConfigKey('nope.nope')).toBe(false);
    // hasOwnProperty, not `in` — otherwise 'toString' would be a "valid key".
    expect(isSystemConfigKey('toString')).toBe(false);
  });
});

describe('FeatureFlag registry ↔ migration seeds', () => {
  it('seeds every registry flag', () => {
    for (const key of FEATURE_FLAG_KEYS) {
      expect(MIGRATION).toContain(`'${key}'`);
    }
  });

  it('ai.kill_switch defaults to NOT engaged (a flag outage must leave AI running)', () => {
    expect(featureFlagDefault('ai.kill_switch')).toBe(false);
    expect(MIGRATION).toMatch(/'ai\.kill_switch',\s*false/);
  });
});

describe('SESSION_POLICY (K9 / A4)', () => {
  it('gives admin the tight caps from Admin PRD §2 + Modül 1 §3.5', () => {
    expect(SESSION_POLICY.admin).toEqual({
      maxConcurrent: 2,
      absoluteMs: 8 * 60 * 60 * 1000,
      idleMs: 15 * 60 * 1000,
    });
  });

  it('keeps the 5-session cap for every non-admin surface', () => {
    for (const ctx of ['patient', 'family', 'caregiver', 'hcp'] as const) {
      expect(SESSION_POLICY[ctx].maxConcurrent).toBe(5);
    }
  });

  it('falls back to the consumer policy for an unknown context (never to admin)', () => {
    expect(sessionPolicyFor('something-new')).toEqual(SESSION_POLICY.patient);
  });
});
