/**
 * FeatureFlag key registry — K10 / Admin Panel PRD A7 + §6.
 *
 * Flags exist for two jobs in this product: gradual rollout of V1 features,
 * and the emergency AI kill switch. Only the second one is real in V0.
 */

export type FeatureFlagScope = 'global' | 'org' | 'user_pct';

export interface FeatureFlagDefinition {
  /** Value when no DB row exists. Chosen so a missing row is always the SAFE
   * state — for a kill switch that means "not engaged", i.e. behave normally,
   * because a flag table outage must not silently disable a live surface. */
  readonly default: boolean;
  readonly scope: FeatureFlagScope;
  readonly appContext: readonly ('patient' | 'family' | 'caregiver' | 'hcp' | 'admin')[];
  /** Admin PRD A7: turning `ai.kill_switch` ON is a single-admin (ops)
   * action — an emergency stop must never need a second person. Turning it
   * back OFF needs two. Declared per-flag rather than special-cased in the
   * admin endpoint. */
  readonly enableRequiresSecondApproval: boolean;
  readonly disableRequiresSecondApproval: boolean;
  readonly description: string;
}

export const FEATURE_FLAG_REGISTRY = {
  /**
   * `enabled = true` means the switch is ENGAGED, i.e. every `/ai/*` surface
   * returns 503 `FEATURE_DISABLED` (Admin PRD §7 kabul kriteri 4: ≤5sn).
   * Read that direction carefully — it is the opposite of the usual
   * "enabled = feature works" convention, and it is deliberate: a flag row
   * that fails to load must leave AI *running*, not kill it.
   *
   * Nothing reads this before Faz 6 (no AI surface exists yet); it is seeded
   * in migration 0015 so the switch predates the thing it switches off.
   */
  'ai.kill_switch': {
    default: false,
    scope: 'global',
    appContext: ['patient', 'family', 'caregiver', 'hcp'],
    enableRequiresSecondApproval: false,
    disableRequiresSecondApproval: true,
    description: 'Tüm AI yüzeylerinin acil kapatma anahtarı (engaged = AI kapalı).',
  },
} as const satisfies Record<string, FeatureFlagDefinition>;

export type FeatureFlagKey = keyof typeof FEATURE_FLAG_REGISTRY;

export const FEATURE_FLAG_KEYS = Object.keys(FEATURE_FLAG_REGISTRY) as FeatureFlagKey[];

export function isFeatureFlagKey(key: string): key is FeatureFlagKey {
  return Object.prototype.hasOwnProperty.call(FEATURE_FLAG_REGISTRY, key);
}

export function featureFlagDefault(key: FeatureFlagKey): boolean {
  return FEATURE_FLAG_REGISTRY[key].default;
}
