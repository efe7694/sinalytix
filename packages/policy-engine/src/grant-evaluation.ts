/**
 * ConsentGrant evaluation (Module 3 §2.2 steps 3-4) — pure functions, no DB
 * access (this package stays DB-agnostic; callers pass in already-fetched
 * grant rows). Default-deny: a category is only permitted if at least one
 * active grant explicitly names it with permission=permit AND no active
 * grant names it with permission=deny (explicit deny always wins).
 */

import { isLockboxCategory } from './lockbox';

/**
 * `grantedToKind`/`grantedToId` are carried for the caller's own bookkeeping
 * (e.g. building the `policy_decisions.context_snapshot`) — this module
 * does NOT check them. The `grants` array passed to `evaluateScope`/
 * `evaluateLockboxScope`/`evaluateAccess` below is trusted to already be
 * pre-filtered to the requesting grantee (e.g. `WHERE granted_to_id = ?`)
 * by the caller; this package has no DB access to verify that itself.
 * Whichever slice adds the first real caller (ConsentGrant) must filter
 * before calling in, not rely on this module to notice a stray grant row
 * belonging to someone else.
 */
export interface ConsentGrantSnapshot {
  grantedToKind: string;
  grantedToId: string;
  scope: string[];
  permission: 'permit' | 'deny';
  periodStart: Date | null;
  periodEnd: Date | null;
  revokedAt: Date | null;
}

export interface ScopeEvaluationResult {
  permittedScope: string[];
  deniedScope: string[];
}

function isGrantActive(grant: ConsentGrantSnapshot, now: Date): boolean {
  if (grant.revokedAt) return false;
  if (grant.periodStart && now < grant.periodStart) return false;
  if (grant.periodEnd && now > grant.periodEnd) return false;
  return true;
}

/** Step 3 — evaluates each requested category independently against the
 * given (already access-scoped, e.g. by granted_to_id) grant snapshots. */
export function evaluateScope(
  grants: ConsentGrantSnapshot[],
  requestedScope: string[],
  now: Date = new Date(),
): ScopeEvaluationResult {
  const active = grants.filter((g) => isGrantActive(g, now));
  const permittedScope: string[] = [];
  const deniedScope: string[] = [];
  for (const category of requestedScope) {
    const matching = active.filter((g) => g.scope.includes(category));
    const hasDeny = matching.some((g) => g.permission === 'deny');
    const hasPermit = matching.some((g) => g.permission === 'permit');
    if (hasDeny || !hasPermit) {
      deniedScope.push(category);
    } else {
      permittedScope.push(category);
    }
  }
  return { permittedScope, deniedScope };
}

/**
 * Step 4 — lockbox categories (B5) are evaluated with the identical logic as
 * any other category (a category is honored if some active grant explicitly
 * names it); this wrapper is the single choke point every read-path must
 * call for lockbox scope, so the "never inherited from a baseline/broader
 * grant" invariant has one tested place and can't be silently special-cased
 * away by a future caller. The invariant itself — that a *baseline* grant
 * (written automatically on link activation, Faz 1 Slice 3) never includes
 * a lockbox category in its own scope — is enforced at grant-creation time,
 * not here; this function only honors whichever grants already exist.
 */
export function evaluateLockboxScope(
  grants: ConsentGrantSnapshot[],
  requestedLockboxScope: string[],
  now: Date = new Date(),
): ScopeEvaluationResult {
  if (requestedLockboxScope.some((c) => !isLockboxCategory(c))) {
    throw new Error('evaluateLockboxScope called with a non-lockbox category');
  }
  return evaluateScope(grants, requestedLockboxScope, now);
}

/** Step 5 — obligations: field-level masking per (resource, role). Extensible
 * without touching call sites as later phases add rules (e.g. Dictionary
 * Module 1 §4.2's canonical example: family sees medication name+time, never
 * dose). */
const OBLIGATION_FIELD_MASKS: Record<string, string[]> = {
  'medication:family_member': ['dose'],
};

export function maskedFieldsFor(resource: string, role: string): string[] {
  return OBLIGATION_FIELD_MASKS[`${resource}:${role}`] ?? [];
}
