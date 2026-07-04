/**
 * PolicyEngine — Module 3 §2.2's 5-step decision order (identity/role →
 * RLS pre-filter → link/grant → lockbox → obligations).
 *
 * Faz 0 scope: only step 1 (identity/role pre-check) has real data behind
 * it — ConsentGrant (Faz 1), CareTeam/lockbox (Faz 1/5) don't exist yet, so
 * steps 2-5 aren't stubbed here with fake logic; they're enforced at the DB
 * layer via RLS (packages/db) until their owning phase adds real evaluation.
 * Consumed by services/core-api's auth guard and (later) services/ws-gateway's
 * topic-subscribe check.
 */

export const POLICY_ENGINE_VERSION = 'faz0-v1';

export interface IdentityCheckContext {
  userStatus: string;
  sessionAppContext: string;
}

export interface IdentityCheckInput {
  requestAppContext: string;
}

export interface PolicyDecisionResult {
  decision: 'permit' | 'deny';
  reasons: string[];
}

/**
 * Module 2 §1.3 (`X-App-Context` must match the session's) + Module 2 §3.1
 * ("`User.status=suspended_*` → tüm uçlar 403 (auth hariç); `incomplete` →
 * yalnız onboarding uçları" — Faz 0's whole surface is auth/onboarding, so
 * `incomplete` is permitted here without a per-route allowlist yet).
 */
export function checkIdentity(
  ctx: IdentityCheckContext,
  input: IdentityCheckInput,
): PolicyDecisionResult {
  if (ctx.sessionAppContext !== input.requestAppContext) {
    return { decision: 'deny', reasons: ['app_context_mismatch'] };
  }
  if (ctx.userStatus === 'suspended_soft' || ctx.userStatus === 'suspended_hard' || ctx.userStatus === 'deactivated') {
    return { decision: 'deny', reasons: ['user_suspended_or_deactivated'] };
  }
  return { decision: 'permit', reasons: [] };
}
