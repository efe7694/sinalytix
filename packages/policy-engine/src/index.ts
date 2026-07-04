/**
 * PolicyEngine — Module 3 §2.2's 5-step decision order (identity/role →
 * RLS pre-filter → link/grant → lockbox → obligations).
 *
 * Faz 0 scope was step 1 only. Faz 1 adds real step 3-5 evaluation
 * (`evaluateAccess`) now that ConsentGrant exists; step 2 (RLS) stays a
 * documented no-op here — it's genuinely enforced at the DB layer
 * (packages/db), not duplicated in this package. Consumed by
 * services/core-api's route guards/services and (later)
 * services/ws-gateway's topic-subscribe check.
 */

export * from './lockbox';
export * from './grant-evaluation';
export * from './policy-decision-log';

import { isLockboxCategory } from './lockbox';
import { evaluateScope, evaluateLockboxScope, maskedFieldsFor } from './grant-evaluation';
import type { ConsentGrantSnapshot } from './grant-evaluation';

export const POLICY_ENGINE_VERSION = 'faz1-v1';

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

export interface AccessCheckContext {
  identity: { userStatus: string; sessionAppContext: string; requestAppContext: string };
  requestedScope: string[];
  grants: ConsentGrantSnapshot[];
  resource: string;
  role: string;
  now?: Date;
}

export interface AccessCheckResult extends PolicyDecisionResult {
  permittedScope: string[];
  deniedScope: string[];
  maskedFields: string[];
}

/**
 * Orchestrates steps 1, 3-5 in the fixed order (Module 3 §2.2) and
 * short-circuits on step 1's deny — step 2 (RLS) is genuinely enforced at
 * the DB layer, not re-implemented here. Callers own step 2 themselves
 * (RLS already narrowed what rows they could even fetch grants for).
 */
export function evaluateAccess(ctx: AccessCheckContext): AccessCheckResult {
  const identityDecision = checkIdentity(
    { userStatus: ctx.identity.userStatus, sessionAppContext: ctx.identity.sessionAppContext },
    { requestAppContext: ctx.identity.requestAppContext },
  );
  if (identityDecision.decision === 'deny') {
    return { ...identityDecision, permittedScope: [], deniedScope: ctx.requestedScope, maskedFields: [] };
  }

  const now = ctx.now ?? new Date();
  const nonLockboxScope = ctx.requestedScope.filter((c) => !isLockboxCategory(c));
  const lockboxScope = ctx.requestedScope.filter((c) => isLockboxCategory(c));
  const nonLockboxResult = evaluateScope(ctx.grants, nonLockboxScope, now);
  const lockboxResult = evaluateLockboxScope(ctx.grants, lockboxScope, now);

  const permittedScope = [...nonLockboxResult.permittedScope, ...lockboxResult.permittedScope];
  const deniedScope = [...nonLockboxResult.deniedScope, ...lockboxResult.deniedScope];
  const decision = permittedScope.length > 0 ? 'permit' : 'deny';

  return {
    decision,
    reasons: decision === 'deny' ? ['no_active_grant_for_requested_scope'] : [],
    permittedScope,
    deniedScope,
    maskedFields: maskedFieldsFor(ctx.resource, ctx.role),
  };
}
