import { describe, expect, it } from 'vitest';
import {
  checkIdentity,
  evaluateAccess,
  evaluateScope,
  evaluateLockboxScope,
  maskedFieldsFor,
  type ConsentGrantSnapshot,
} from '@sinalytix/policy-engine';

function grant(overrides: Partial<ConsentGrantSnapshot> = {}): ConsentGrantSnapshot {
  return {
    grantedToKind: 'family_member',
    grantedToId: 'family-user-1',
    scope: ['medications'],
    permission: 'permit',
    periodStart: null,
    periodEnd: null,
    revokedAt: null,
    ...overrides,
  };
}

describe('checkIdentity (Module 2 §1.3, §3.1)', () => {
  it('denies on app_context mismatch', () => {
    const result = checkIdentity(
      { userStatus: 'active', sessionAppContext: 'patient' },
      { requestAppContext: 'family' },
    );
    expect(result).toEqual({ decision: 'deny', reasons: ['app_context_mismatch'] });
  });

  it('denies a suspended/deactivated user even with a matching app_context', () => {
    for (const userStatus of ['suspended_soft', 'suspended_hard', 'deactivated']) {
      const result = checkIdentity({ userStatus, sessionAppContext: 'patient' }, { requestAppContext: 'patient' });
      expect(result.decision).toBe('deny');
    }
  });

  it('permits an active user with a matching app_context', () => {
    const result = checkIdentity({ userStatus: 'active', sessionAppContext: 'patient' }, { requestAppContext: 'patient' });
    expect(result).toEqual({ decision: 'permit', reasons: [] });
  });
});

describe('evaluateScope — default-deny, explicit deny beats permit (Module 3 §2.2 step 3)', () => {
  it('denies a category with no matching grant at all', () => {
    const result = evaluateScope([grant({ scope: ['medications'] })], ['vitals']);
    expect(result.deniedScope).toEqual(['vitals']);
    expect(result.permittedScope).toEqual([]);
  });

  it('permits a category with an active permit grant naming it', () => {
    const result = evaluateScope([grant({ scope: ['medications'] })], ['medications']);
    expect(result.permittedScope).toEqual(['medications']);
  });

  it('explicit deny wins even when a permit grant also names the category', () => {
    const grants = [
      grant({ grantedToId: 'a', scope: ['medications'], permission: 'permit' }),
      grant({ grantedToId: 'a', scope: ['medications'], permission: 'deny' }),
    ];
    const result = evaluateScope(grants, ['medications']);
    expect(result.deniedScope).toEqual(['medications']);
  });

  it('ignores a revoked grant', () => {
    const result = evaluateScope([grant({ scope: ['medications'], revokedAt: new Date() })], ['medications']);
    expect(result.deniedScope).toEqual(['medications']);
  });

  it('ignores a grant whose period has not started yet', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60);
    const result = evaluateScope([grant({ scope: ['medications'], periodStart: future })], ['medications']);
    expect(result.deniedScope).toEqual(['medications']);
  });

  it('ignores a grant whose period has already ended', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60);
    const result = evaluateScope([grant({ scope: ['medications'], periodEnd: past })], ['medications']);
    expect(result.deniedScope).toEqual(['medications']);
  });

  it('honors a grant within its active period window', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60);
    const future = new Date(Date.now() + 1000 * 60 * 60);
    const result = evaluateScope([grant({ scope: ['medications'], periodStart: past, periodEnd: future })], ['medications']);
    expect(result.permittedScope).toEqual(['medications']);
  });
});

describe('evaluateLockboxScope (B5) — never inherited from a broader/baseline grant', () => {
  it('denies a lockbox category even when a differently-scoped grant is active for the same grantee', () => {
    // A "baseline" family grant naming only non-lockbox categories must never
    // leak access to mental_health just because *some* grant exists for them.
    const baseline = grant({ scope: ['medications', 'vitals', 'appointments'] });
    const result = evaluateLockboxScope([baseline], ['mental_health']);
    expect(result.deniedScope).toEqual(['mental_health']);
  });

  it('permits a lockbox category only when a grant explicitly names it', () => {
    const explicit = grant({ scope: ['mental_health'] });
    const result = evaluateLockboxScope([explicit], ['mental_health']);
    expect(result.permittedScope).toEqual(['mental_health']);
  });

  it('substance_use is never treated differently from the other 3 lockbox categories (B5: no bypass)', () => {
    const result = evaluateLockboxScope([grant({ scope: ['medications'] })], ['substance_use']);
    expect(result.deniedScope).toEqual(['substance_use']);
  });

  it('throws if called with a non-lockbox category (defends the choke-point invariant)', () => {
    expect(() => evaluateLockboxScope([], ['medications'])).toThrow();
  });
});

describe('maskedFieldsFor (Module 1 §4.2 obligations)', () => {
  it("masks a family member's view of medication dose", () => {
    expect(maskedFieldsFor('medication', 'family_member')).toEqual(['dose']);
  });

  it('returns no masked fields for an undeclared (resource, role) pair', () => {
    expect(maskedFieldsFor('medication', 'caregiver')).toEqual([]);
  });
});

describe('evaluateAccess — full orchestration (steps 1, 3-5)', () => {
  it('short-circuits on identity deny without evaluating grants', () => {
    const result = evaluateAccess({
      identity: { userStatus: 'active', sessionAppContext: 'patient', requestAppContext: 'family' },
      requestedScope: ['medications'],
      grants: [grant({ scope: ['medications'] })],
      resource: 'medication',
      role: 'family_member',
    });
    expect(result.decision).toBe('deny');
    expect(result.reasons).toEqual(['app_context_mismatch']);
    expect(result.permittedScope).toEqual([]);
  });

  it('permits non-lockbox scope and separately denies lockbox scope in one call', () => {
    const result = evaluateAccess({
      identity: { userStatus: 'active', sessionAppContext: 'family', requestAppContext: 'family' },
      requestedScope: ['medications', 'mental_health'],
      grants: [grant({ scope: ['medications'] })],
      resource: 'medication',
      role: 'family_member',
      now: new Date(),
    });
    expect(result.decision).toBe('permit');
    expect(result.permittedScope).toEqual(['medications']);
    expect(result.deniedScope).toEqual(['mental_health']);
    expect(result.maskedFields).toEqual(['dose']);
  });

  it('denies overall when no requested category has an active grant', () => {
    const result = evaluateAccess({
      identity: { userStatus: 'active', sessionAppContext: 'family', requestAppContext: 'family' },
      requestedScope: ['vitals'],
      grants: [],
      resource: 'observation',
      role: 'family_member',
    });
    expect(result.decision).toBe('deny');
  });
});
