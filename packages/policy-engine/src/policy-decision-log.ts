/**
 * Pure row-shape mapper for `policy_decisions` (Module 1 §8.1, Module 3
 * §2.3) — deliberately doesn't touch a DB connection (this package stays
 * DB-agnostic); `services/core-api/src/common/policy.service.ts` is the only
 * place that takes this record and actually inserts it, mirroring how
 * `@sinalytix/audit`'s `writeAuditLog` owns its own DB write.
 */

export interface PolicyDecisionRecordInput {
  subjectPractitionerRoleId?: string | null;
  actorUserId?: string | null;
  action: string;
  resource: string;
  contextSnapshot: Record<string, unknown>;
  decision: 'permit' | 'deny';
  reasons: string[];
  obligations: Record<string, unknown>;
  policyEngineVersion: string;
}

export interface PolicyDecisionRecord {
  subject_practitioner_role_id: string | null;
  actor_user_id: string | null;
  action: string;
  resource: string;
  context_snapshot: string;
  decision: string;
  reasons: string[];
  obligations: string;
  policy_engine_version: string;
}

/** `context_snapshot` must never contain PHI (Module 1 §8.1) — callers pass
 * only ids/enum values/decision reasons, not resource content. */
export function buildPolicyDecisionRecord(input: PolicyDecisionRecordInput): PolicyDecisionRecord {
  return {
    subject_practitioner_role_id: input.subjectPractitionerRoleId ?? null,
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    resource: input.resource,
    context_snapshot: JSON.stringify(input.contextSnapshot),
    decision: input.decision,
    reasons: input.reasons,
    obligations: JSON.stringify(input.obligations),
    policy_engine_version: input.policyEngineVersion,
  };
}
