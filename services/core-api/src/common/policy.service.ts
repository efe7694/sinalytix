import { Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import {
  evaluateAccess,
  buildPolicyDecisionRecord,
  POLICY_ENGINE_VERSION,
  type AccessCheckContext,
  type AccessCheckResult,
} from '@sinalytix/policy-engine';

export interface PolicyEvaluationInput extends AccessCheckContext {
  actorUserId: string;
  subjectPractitionerRoleId?: string;
  /** What was attempted, e.g. `'read'`/`'family_link.confirm'` — distinct
   * from `identity.requestAppContext`, which is which app is asking. */
  action: string;
}

/**
 * The one place `@sinalytix/policy-engine`'s pure evaluation meets an actual
 * `policy_decisions` write (Module 1 §8.1, Module 3 §2.3) — mirrors how
 * `@sinalytix/audit`'s `writeAuditLog` owns its own DB write, but
 * policy-engine itself stays DB-agnostic (also meant to be reused later by
 * services/ws-gateway's topic-subscribe check, which may not want a Kysely
 * dependency at all).
 *
 * Writes happen inside the caller's own transaction — a permit decision
 * that's about to be acted on and the decision record documenting it should
 * commit or roll back together.
 */
@Injectable()
export class PolicyService {
  async evaluate(trx: Kysely<Database>, input: PolicyEvaluationInput): Promise<AccessCheckResult> {
    const result = evaluateAccess(input);

    const record = buildPolicyDecisionRecord({
      subjectPractitionerRoleId: input.subjectPractitionerRoleId ?? null,
      actorUserId: input.actorUserId,
      action: input.action,
      resource: input.resource,
      contextSnapshot: {
        requested_scope: input.requestedScope,
        role: input.role,
      },
      decision: result.decision,
      reasons: result.reasons,
      obligations: { masked_fields: result.maskedFields },
      policyEngineVersion: POLICY_ENGINE_VERSION,
    });

    await trx.insertInto('policy_decisions').values(record).execute();

    return result;
  }
}
