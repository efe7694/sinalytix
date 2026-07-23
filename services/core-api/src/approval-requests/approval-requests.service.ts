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
import { ApiException } from '../common/api.exception';
import { ApiErrorCode } from '@sinalytix/domain';
import { ecApplyCreate, ecApplyRemove, ecApplyUpdate, ecNextSortOrder } from '@sinalytix/db';
import { describeApprovalAction } from '@sinalytix/i18n';
import type { Locale } from '@sinalytix/i18n';

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
      throw ApiException.permissionDenied('approval.config_patient_only');
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
      throw ApiException.permissionDenied('approval.config_view_patient_only');
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
  async listForPatient(patientId: string, actingUserId: string, locale: Locale = 'en'): Promise<ApprovalRequestPublic[]> {
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
        description: describeApprovalAction(r.action_type, r.requested_by_name, locale),
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
        throw ApiException.notFound();
      }
      if (req.requested_by === actingUserId) {
        throw ApiException.permissionDenied('approval.cannot_approve_own');
      }
      if (req.status !== ApprovalStatus.PENDING) {
        throw ApiException.conflict('approval.already_decided');
      }
      if (req.expires_at.getTime() < Date.now()) {
        throw ApiException.conflict('approval.expired');
      }

      const decided = await approvalRequestDecide(trx, approvalId, actingUserId, decision);
      if (!decided) {
        // Visible (RLS) but not an eligible approver — an active family member
        // is required. Distinct from the not-found case above.
        throw ApiException.permissionDenied('approval.decider_must_be_active_family');
      }

      if (decision === 'approved') {
        // `decided.patient_id` comes from the request row, which only the
        // patient's own gated action could have created — never from the
        // approver's session and never from the (client-influenced) payload.
        // That is what makes the SECURITY DEFINER executors safe to call here.
        await this.executeDeferredAction(trx, decided.action_type, decided.action_payload, decided.patient_id);
      }
    });
  }

  /** Re-executes the stored action on approval, dispatching by type. Each
   * executor is a SECURITY DEFINER function that authorizes by the stored
   * requester id (not the approving family member's session), which is what
   * lets a family member's approval carry out a caregiver's action. */
  private async executeDeferredAction(
    trx: Kysely<Database>,
    actionType: string,
    payload: unknown,
    patientId: string,
  ): Promise<void> {
    if (actionType === ApprovalActionType.CAREGIVER_LINK_CHANGE) {
      const p = payload as { link_id: string; requester_caregiver_id: string };
      await unlinkCaregiverLink(trx, p.link_id, p.requester_caregiver_id);
      return;
    }

    if (actionType === ApprovalActionType.EC_CHANGE) {
      const p = payload as {
        op: 'create' | 'update' | 'remove';
        ec_id?: string;
        relationship?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        phone?: string | null;
      };
      if (p.op === 'create') {
        // Everything below is re-resolved at APPROVAL time, not request time:
        // 48 hours is plenty for the patient to have freed/filled a slot or —
        // via a second, separately-approved pending request — already added
        // this very phone. Two co-pending same-phone creates both pass the
        // request-time duplicate check (neither is inserted while pending), so
        // without this the second approval trips the partial-unique index and
        // 500s the approver + rolls back the decision (independent review,
        // Finding 2). If the phone is already an active contact, the create is
        // a satisfied no-op — the patient's intent ("have this number as a
        // contact") already holds.
        if (await this.ecPhoneExists(trx, patientId, p.phone ?? '')) {
          return;
        }
        const sortOrder = await ecNextSortOrder(trx, patientId);
        if (sortOrder === null) {
          throw new ApiException({
            code: ApiErrorCode.CONFLICT,
            messageKey: 'ec.max_contacts',
            messageParams: { max: 3 },
          });
        }
        await ecApplyCreate(trx, {
          patientId,
          relationship: p.relationship ?? '',
          firstName: p.first_name ?? '',
          lastName: p.last_name ?? '',
          phone: p.phone ?? '',
          sortOrder,
        });
        return;
      }
      if (p.op === 'update' && p.ec_id) {
        // Same guard for a phone edit that now collides with another active
        // contact's number (added/edited while this request sat pending).
        // Skip only the phone field in that case — the rest of the edit
        // (name/relationship) is still applied, and the phone simply stays
        // what it was, which is the safe outcome (the SOS chain keeps a valid,
        // non-duplicated number).
        const phoneCollides =
          p.phone != null && (await this.ecPhoneExists(trx, patientId, p.phone, p.ec_id));
        await ecApplyUpdate(trx, {
          ecId: p.ec_id,
          patientId,
          relationship: p.relationship,
          firstName: p.first_name,
          lastName: p.last_name,
          phone: phoneCollides ? null : p.phone,
        });
        return;
      }
      if (p.op === 'remove' && p.ec_id) {
        // A false return means the contact is already gone — the patient
        // removed it another way while the request sat pending. Approving a
        // no-op is the right outcome, not an error: the approver's intent
        // ("yes, remove it") is satisfied either way.
        await ecApplyRemove(trx, p.ec_id, patientId);
        return;
      }
      return;
    }

    // `profile_edit` and `account_delete` are valid config keys (FAM-12 §3)
    // but have no gated trigger endpoint yet — profile_edit defaults to
    // ungated, and account deletion is "bilgilendirme" (notify, never block),
    // so no pending request of either type can reach here.
  }

  /** Is `phone` already an active emergency contact for `patientId`? Runs on
   * the same `trx` as the deferred executor (owner-privileged inside the
   * decide transaction), so it sees the patient's own rows including any
   * added by a sibling approval in this same window. `excludeEcId` skips the
   * row being edited. */
  private async ecPhoneExists(
    trx: Kysely<Database>,
    patientId: string,
    phone: string,
    excludeEcId?: string,
  ): Promise<boolean> {
    let q = trx
      .selectFrom('emergency_contacts')
      .select('ec_id')
      .where('patient_id', '=', patientId)
      .where('phone', '=', phone)
      .where('deleted_at', 'is', null);
    if (excludeEcId) q = q.where('ec_id', '!=', excludeEcId);
    return (await q.executeTakeFirst()) !== undefined;
  }
}
