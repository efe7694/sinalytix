/**
 * Wrappers around the SECURITY DEFINER approval functions from migration
 * 0014_approval-request.js — see that file's header for why the config read,
 * approver count, request-create, and decide writes bypass RLS (cross-actor,
 * per the D12/D13 lesson).
 */
import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Database } from './types';

export async function approvalConfigRequiresApproval(
  db: Kysely<Database>,
  patientId: string,
  actionType: string,
): Promise<boolean> {
  const result = await sql<{ approval_config_requires_approval: boolean }>`
    select approval_config_requires_approval(${patientId}, ${actionType}) as approval_config_requires_approval
  `.execute(db);
  return result.rows[0]?.approval_config_requires_approval ?? false;
}

export async function approvalCountEligibleApprovers(
  db: Kysely<Database>,
  patientId: string,
  excludeUserId: string,
): Promise<number> {
  const result = await sql<{ approval_count_eligible_approvers: number }>`
    select approval_count_eligible_approvers(${patientId}, ${excludeUserId}) as approval_count_eligible_approvers
  `.execute(db);
  return Number(result.rows[0]?.approval_count_eligible_approvers ?? 0);
}

export async function approvalRequestCreate(
  db: Kysely<Database>,
  input: {
    patientId: string;
    actionType: string;
    actionPayload: unknown;
    requestedBy: string;
    requestedByRole: string;
    requestedByName: string;
    status: string;
    expiresAt: Date;
  },
): Promise<string> {
  const result = await sql<{ approval_id: string }>`
    select approval_request_create(
      ${input.patientId}, ${input.actionType}, ${JSON.stringify(input.actionPayload)}::jsonb,
      ${input.requestedBy}, ${input.requestedByRole}, ${input.requestedByName}, ${input.status}, ${input.expiresAt}
    ) as approval_id
  `.execute(db);
  return result.rows[0]!.approval_id;
}

export interface ApprovalDecideResult {
  approval_id: string;
  action_type: string;
  action_payload: unknown;
  patient_id: string;
  requested_by: string;
}

/** Approve/reject a pending request. Returns undefined if the decider isn't an
 * eligible approver, the request is missing, expired, already decided, or is
 * the decider's own — the service distinguishes those by re-reading. */
export async function approvalRequestDecide(
  db: Kysely<Database>,
  approvalId: string,
  deciderId: string,
  decision: 'approved' | 'rejected',
): Promise<ApprovalDecideResult | undefined> {
  const result = await sql<ApprovalDecideResult>`
    select * from approval_request_decide(${approvalId}, ${deciderId}, ${decision})
  `.execute(db);
  return result.rows[0];
}
