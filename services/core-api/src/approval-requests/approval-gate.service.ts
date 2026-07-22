import { Inject, Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import { approvalConfigRequiresApproval, approvalCountEligibleApprovers, approvalRequestCreate } from '@sinalytix/db';
import { ApprovalStatus, RequestedByRole, type ApprovalActionType, type GatedActionResult } from '@sinalytix/domain';
import { KYSELY } from '../common/db.module';
import { SystemConfigService } from '../common/system-config.service';

export interface GateInput {
  patientId: string;
  actionType: ApprovalActionType;
  /** Everything needed to re-execute the action later, on approval — must
   * carry the requester id so the deferred executor runs as them. */
  actionPayload: Record<string, unknown>;
  requesterId: string;
  requesterRole: (typeof RequestedByRole)[keyof typeof RequestedByRole];
  /** Performs the action NOW. Called immediately for the ungated /
   * no-approver paths; NOT called for the deferred (pending) path (the
   * approve() flow re-executes it from action_payload instead). */
  executeAction: () => Promise<void>;
}

/**
 * The reusable approval gate (Faz 1 Slice 5). Call it from inside a domain
 * action's own transaction, as the requester. Decides — from the patient's
 * config + the count of eligible family approvers — whether to run the action
 * now or defer it behind a pending ApprovalRequest.
 *
 * Cross-actor reads (patient config, approver count) and the request insert go
 * through SECURITY DEFINER functions (migration 0014), so the requester
 * (usually a caregiver) needs no RLS access to the patient's config or links.
 */
@Injectable()
export class ApprovalGateService {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    private readonly systemConfig: SystemConfigService,
  ) {}

  async maybeGate(trx: Kysely<Database>, input: GateInput): Promise<GatedActionResult> {
    const requires = await approvalConfigRequiresApproval(trx, input.patientId, input.actionType);
    if (!requires) {
      // Unconfigured or explicitly not gated → run now, create no row.
      await input.executeAction();
      return { executed: true, status: ApprovalStatus.APPROVED, approval_id: null };
    }

    const approvers = await approvalCountEligibleApprovers(trx, input.patientId, input.requesterId);
    // K10/A3: was a hardcoded 48h. `approval.expiry_hours` (K4) is an
    // ops-tunable SystemConfig key; the 24h reminder + expiry sweep remain a
    // job-runner concern (deferred, D14) and will read
    // `approval.reminder_hours` from the same registry.
    const expiresAt = new Date(Date.now() + (await this.systemConfig.getMs('approval.expiry_hours', 'hour')));
    const requestedByName = await this.requesterName(trx, input.requesterId, input.requesterRole);
    const base = {
      patientId: input.patientId,
      actionType: input.actionType,
      actionPayload: input.actionPayload,
      requestedBy: input.requesterId,
      requestedByRole: input.requesterRole,
      requestedByName,
      expiresAt,
    };

    if (approvers === 0) {
      // Gated, but nobody could ever approve — running it and recording
      // auto_approved_no_approver is better than silently blocking forever.
      await input.executeAction();
      const approvalId = await approvalRequestCreate(trx, { ...base, status: ApprovalStatus.AUTO_APPROVED_NO_APPROVER });
      return { executed: true, status: ApprovalStatus.AUTO_APPROVED_NO_APPROVER, approval_id: approvalId };
    }

    // Defer: create a pending request; the action does NOT run yet.
    const approvalId = await approvalRequestCreate(trx, { ...base, status: ApprovalStatus.PENDING });
    return { executed: false, status: ApprovalStatus.PENDING, approval_id: approvalId };
  }

  /** The requester's display name, read from their OWN profile (each profile
   * table is self-readable under RLS), snapshotted onto the request so the
   * patient/family approver — who can't read the requester's profile — still
   * sees who asked. Falls back to a role label if the profile is nameless. */
  private async requesterName(
    trx: Kysely<Database>,
    requesterId: string,
    role: (typeof RequestedByRole)[keyof typeof RequestedByRole],
  ): Promise<string> {
    const table =
      role === RequestedByRole.CAREGIVER
        ? 'caregiver_profiles'
        : role === RequestedByRole.FAMILY
          ? 'family_profiles'
          : 'patient_profiles';
    const row = await trx
      .selectFrom(table)
      .select(['first_name', 'last_name'])
      .where('user_id', '=', requesterId)
      .executeTakeFirst();
    const name = [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim();
    if (name) return name;
    return role === RequestedByRole.CAREGIVER ? 'Bakıcı' : role === RequestedByRole.FAMILY ? 'Aile Üyesi' : 'Hasta';
  }
}
