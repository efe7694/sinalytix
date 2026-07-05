import { Inject, Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import { approvalRequestDecide, unlinkCaregiverLink, withRlsContext } from '@sinalytix/db';
import {
  ApprovalActionType,
  ApprovalStatus,
  type ApprovalRequestPublic,
  type PatientApprovalConfigPublic,
  type UpdateApprovalConfigRequest,
} from '@sinalytix/domain';
import { KYSELY } from '../common/db.module';
import { ProblemException } from '../common/problem.exception';

/** Human-readable descriptions for the family approvals screen, computed from
 * action_type + payload so the 3 apps don't each reimplement a mapper. */
function describe(actionType: string, requestedByName: string): string {
  switch (actionType) {
    case ApprovalActionType.CAREGIVER_LINK_CHANGE:
      return `${requestedByName} bakıcı bağlantısını sonlandırmak istiyor.`;
    case ApprovalActionType.FAMILY_LINK_PERMISSION_CHANGE:
      return `${requestedByName} erişim düzeyini değiştirmek istiyor.`;
    default:
      return 'Onay bekleyen bir işlem.';
  }
}

@Injectable()
export class ApprovalRequestsService {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  // ── Patient side: configure which actions need approval (PATCH) ─────────

  async upsertConfig(
    patientId: string,
    actingUserId: string,
    body: UpdateApprovalConfigRequest,
  ): Promise<PatientApprovalConfigPublic> {
    if (patientId !== actingUserId) {
      // Owner-only, independent of RLS (approval config is the patient's own).
      throw ProblemException.forbidden('Yalnız hasta kendi onay ayarlarını değiştirebilir.');
    }
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      const row = await trx
        .insertInto('patient_approval_configs')
        .values({ patient_id: patientId, action_type: body.action_type, requires_approval: body.requires_approval })
        .onConflict((oc) =>
          oc.columns(['patient_id', 'action_type']).doUpdateSet({ requires_approval: body.requires_approval, updated_at: new Date() }),
        )
        .returningAll()
        .executeTakeFirstOrThrow();
      return {
        patient_id: row.patient_id,
        action_type: row.action_type as PatientApprovalConfigPublic['action_type'],
        requires_approval: row.requires_approval,
      };
    });
  }

  async listConfig(patientId: string, actingUserId: string): Promise<PatientApprovalConfigPublic[]> {
    if (patientId !== actingUserId) {
      throw ProblemException.forbidden('Yalnız hasta kendi onay ayarlarını görüntüleyebilir.');
    }
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      const rows = await trx.selectFrom('patient_approval_configs').selectAll().where('patient_id', '=', patientId).execute();
      return rows.map((r) => ({
        patient_id: r.patient_id,
        action_type: r.action_type as PatientApprovalConfigPublic['action_type'],
        requires_approval: r.requires_approval,
      }));
    });
  }

  // ── Approver / patient side: list requests for a patient ────────────────

  /** Requests for a patient, visible to the patient and their active family
   * members (RLS `approval_requests_select`). The family approvals screen
   * passes the patientId it has selected from its roster. */
  async listForPatient(patientId: string, actingUserId: string): Promise<ApprovalRequestPublic[]> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      // requested_by_name is denormalized on the row (snapshot at creation),
      // so no cross-actor profile join is needed here — the approver couldn't
      // read the requester's profile under RLS anyway (migration 0014).
      const rows = await trx
        .selectFrom('approval_requests')
        .selectAll()
        .where('patient_id', '=', patientId)
        .orderBy('created_at', 'desc')
        .execute();

      return rows.map((r) => ({
        approval_id: r.approval_id,
        action_type: r.action_type as ApprovalRequestPublic['action_type'],
        status: r.status as ApprovalRequestPublic['status'],
        requested_by: r.requested_by,
        requested_by_role: r.requested_by_role as ApprovalRequestPublic['requested_by_role'],
        requested_by_name: r.requested_by_name,
        description: describe(r.action_type, r.requested_by_name),
        created_at: r.created_at.toISOString(),
        expires_at: r.expires_at.toISOString(),
      }));
    });
  }

  // ── Approver side: approve / reject (executes the deferred action) ──────

  async decide(approvalId: string, actingUserId: string, decision: 'approved' | 'rejected'): Promise<void> {
    await withRlsContext(this.db, { actingUserId }, async (trx) => {
      // Pre-checks for precise errors (the SECURITY DEFINER decide below is
      // the atomic enforcement; these just turn its "0 rows" into the right
      // status code). The approver can SELECT the row via RLS.
      const req = await trx
        .selectFrom('approval_requests')
        .selectAll()
        .where('approval_id', '=', approvalId)
        .executeTakeFirst();
      if (!req) {
        throw ProblemException.notFound();
      }
      if (req.requested_by === actingUserId) {
        throw ProblemException.forbidden('Kendi talebinizi onaylayamazsınız.');
      }
      if (req.status !== ApprovalStatus.PENDING) {
        throw ProblemException.conflict('Bu talep zaten karara bağlanmış.');
      }
      if (req.expires_at.getTime() < Date.now()) {
        throw ProblemException.conflict('Bu talebin süresi dolmuş.');
      }

      const decided = await approvalRequestDecide(trx, approvalId, actingUserId, decision);
      if (!decided) {
        // Visible (RLS) but not an eligible approver — an active family member
        // is required. Distinct from the not-found case above.
        throw ProblemException.forbidden('Bu talebi yalnız hastanın aktif aile üyesi karara bağlayabilir.');
      }

      if (decision === 'approved') {
        await this.executeDeferredAction(trx, decided.action_type, decided.action_payload);
      }
    });
  }

  /** Re-executes the stored action on approval, dispatching by type. Each
   * executor is a SECURITY DEFINER function that authorizes by the stored
   * requester id (not the approving family member's session), which is what
   * lets a family member's approval carry out a caregiver's action. */
  private async executeDeferredAction(trx: Kysely<Database>, actionType: string, payload: unknown): Promise<void> {
    if (actionType === ApprovalActionType.CAREGIVER_LINK_CHANGE) {
      const p = payload as { link_id: string; requester_caregiver_id: string };
      await unlinkCaregiverLink(trx, p.link_id, p.requester_caregiver_id);
      return;
    }
    // family_link_permission_change has no trigger endpoint this slice (its
    // product semantics await clarification — see DEVIATIONS D14), so no
    // pending request of that type can exist to reach here.
  }
}
