import { Inject, Injectable } from '@nestjs/common';
import { sql, type Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import {
  findCaregiverLinkByCode,
  findCaregiverLinkByQrPayload,
  redeemCaregiverLink,
  unlinkCaregiverLink,
  withRlsContext,
} from '@sinalytix/db';
import {
  ApprovalActionType,
  ApprovalStatus,
  CaregiverLinkStatus,
  RequestedByRole,
  type GatedActionResult,
  type GenerateCaregiverLinkCodeResponse,
  type LinkedPatientForCaregiver,
  type RedeemCaregiverLinkRequest,
} from '@sinalytix/domain';
import { KYSELY } from '../common/db.module';
import { ProblemException } from '../common/problem.exception';
import { randomToken } from '../common/hash.util';
import { RedeemRateLimiter } from '../common/redeem-rate-limiter.service';
import { ApprovalGateService } from '../approval-requests/approval-gate.service';
import { SystemConfigService } from '../common/system-config.service';

const REDEEM_NAMESPACE = 'caregiver-link';

/** 6-char uppercase alphanumeric, legacy parity (caregiver_service.py). Omits
 * easily-confused chars (0/O, 1/I) so a code read aloud/typed is unambiguous. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomCaregiverCode(): string {
  const bytes = randomToken(6); // base64url, plenty of entropy; map to the alphabet
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += CODE_ALPHABET[bytes.charCodeAt(i) % CODE_ALPHABET.length];
  }
  return out;
}

@Injectable()
export class CaregiverLinksService {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    private readonly redeemRateLimiter: RedeemRateLimiter,
    private readonly approvalGate: ApprovalGateService,
    private readonly systemConfig: SystemConfigService,
  ) {}

  // ── Patient side: generate / revoke a caregiver code ────────────────────

  async generateCode(patientId: string, actingUserId: string): Promise<GenerateCaregiverLinkCodeResponse> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      // Generating a new code replaces any live pending one (mirrors the
      // existing patient-UI behavior + the one-pending-per-patient index).
      await trx
        .updateTable('caregiver_links')
        .set({ status: CaregiverLinkStatus.EXPIRED })
        .where('patient_id', '=', patientId)
        .where('status', '=', CaregiverLinkStatus.PENDING)
        .execute();

      const code = randomCaregiverCode();
      const qrPayload = randomToken(24);
      const expiresAt = new Date(Date.now() + (await this.systemConfig.getMs('link.code_ttl_min', 'min')));
      const row = await trx
        .insertInto('caregiver_links')
        .values({ patient_id: patientId, code, qr_payload: qrPayload, expires_at: expiresAt })
        .returningAll()
        .executeTakeFirstOrThrow();

      // No SMS/push provider — dev-only stand-in, same as the other code flows.
      // eslint-disable-next-line no-console
      console.log(`[dev-only] caregiver-link code for patient ${patientId}: ${code} (qr: ${qrPayload})`);

      return { link_id: row.link_id, code: row.code, qr_payload: row.qr_payload, expires_at: expiresAt.toISOString() };
    });
  }

  async revokeCode(patientId: string, actingUserId: string): Promise<void> {
    await withRlsContext(this.db, { actingUserId }, async (trx) => {
      const result = await trx
        .updateTable('caregiver_links')
        .set({ status: CaregiverLinkStatus.EXPIRED })
        .where('patient_id', '=', patientId)
        .where('status', '=', CaregiverLinkStatus.PENDING)
        .executeTakeFirst();
      if (Number(result.numUpdatedRows) === 0) {
        throw ProblemException.notFound();
      }
    });
  }

  // ── Caregiver side: redeem ───────────────────────────────────────────────

  async redeem(actingUserId: string, body: RedeemCaregiverLinkRequest): Promise<LinkedPatientForCaregiver> {
    await this.redeemRateLimiter.assertNotLockedOut(REDEEM_NAMESPACE, actingUserId);

    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      const found = body.code
        ? await findCaregiverLinkByCode(trx, body.code.toUpperCase())
        : await findCaregiverLinkByQrPayload(trx, body.qr_payload as string);
      if (!found) {
        return this.redeemRateLimiter.recordFailureAndThrow(REDEEM_NAMESPACE, actingUserId);
      }

      // Already linked to this patient? A second live link for the same pair
      // would trip the unique index (500) — return a clean 409 instead.
      const existing = await trx
        .selectFrom('caregiver_links')
        .select('link_id')
        .where('patient_id', '=', found.patient_id)
        .where('caregiver_id', '=', actingUserId)
        .where('status', '=', CaregiverLinkStatus.LINKED)
        .executeTakeFirst();
      if (existing) {
        throw ProblemException.conflict('Bu hastayla zaten bağlısınız.');
      }

      const redeemed = await redeemCaregiverLink(trx, found.link_id, actingUserId);
      if (!redeemed) {
        // Concurrently redeemed/expired between lookup and write.
        return this.redeemRateLimiter.recordFailureAndThrow(REDEEM_NAMESPACE, actingUserId);
      }

      // Join the patient's display name for the success screen / roster. The
      // caregiver's own caregiver_links_caregiver_select + patient_profiles'
      // caregiver-read policy (this migration) make this visible now that the
      // link is 'linked'.
      const patient = await trx
        .selectFrom('patient_profiles')
        .select(['user_id', 'first_name', 'last_name'])
        .where('user_id', '=', redeemed.patient_id)
        .executeTakeFirst();

      return {
        link_id: redeemed.link_id,
        patient_id: redeemed.patient_id,
        first_name: patient?.first_name ?? null,
        last_name: patient?.last_name ?? null,
        status: CaregiverLinkStatus.LINKED,
        linked_at: new Date().toISOString(),
      };
    });
  }

  /**
   * Either party ends an active link. A PATIENT unlinking their own caregiver
   * runs immediately (their own decision). A CAREGIVER-initiated unlink is
   * gated through the approval fabric (Faz 1 Slice 5): if the patient has
   * configured `caregiver_link_change` to require approval and has eligible
   * family approvers, it becomes a pending ApprovalRequest and does NOT take
   * effect until a family member approves it — the family oversees who cares
   * for the patient. Otherwise it runs immediately.
   */
  async unlink(linkId: string, actingUserId: string): Promise<GatedActionResult> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      // Both parties can SELECT the row (owner / caregiver_select policies); a
      // stranger sees nothing → 404. Read it first to know who's unlinking.
      const link = await trx
        .selectFrom('caregiver_links')
        .select(['patient_id', 'caregiver_id', 'status'])
        .where('link_id', '=', linkId)
        .executeTakeFirst();
      if (!link || link.status !== CaregiverLinkStatus.LINKED) {
        throw ProblemException.notFound();
      }

      const runUnlink = async (): Promise<void> => {
        const result = await unlinkCaregiverLink(trx, linkId, actingUserId);
        if (!result) {
          throw ProblemException.notFound();
        }
      };

      if (link.caregiver_id === actingUserId) {
        // Reject a duplicate: if this caregiver already has a pending unlink
        // request for THIS link, don't create a second one (the partial index
        // is a non-unique lookup index; the target link_id lives in the jsonb
        // payload, so dedup is enforced here, not by a constraint). The
        // caregiver can read their own requests via RLS (requested_by = actor).
        const existingPending = await trx
          .selectFrom('approval_requests')
          .select('approval_id')
          .where('requested_by', '=', actingUserId)
          .where('action_type', '=', ApprovalActionType.CAREGIVER_LINK_CHANGE)
          .where('status', '=', ApprovalStatus.PENDING)
          .where(sql<boolean>`action_payload->>'link_id' = ${linkId}`)
          .executeTakeFirst();
        if (existingPending) {
          throw ProblemException.conflict('Bu bağlantı için zaten bekleyen bir onay talebi var.');
        }

        // Caregiver-initiated → gate. The stored payload carries the caregiver
        // id so an approving family member's decision can re-run the unlink
        // (via the SECURITY DEFINER function) as the caregiver.
        return this.approvalGate.maybeGate(trx, {
          patientId: link.patient_id,
          actionType: ApprovalActionType.CAREGIVER_LINK_CHANGE,
          actionPayload: { link_id: linkId, requester_caregiver_id: actingUserId },
          requesterId: actingUserId,
          requesterRole: RequestedByRole.CAREGIVER,
          executeAction: runUnlink,
        });
      }

      // Patient-initiated → immediate, never gated.
      await runUnlink();
      return { executed: true, status: ApprovalStatus.APPROVED, approval_id: null };
    });
  }

  // ── Caregiver side: roster ───────────────────────────────────────────────

  async listMyPatients(actingUserId: string): Promise<LinkedPatientForCaregiver[]> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      const rows = await trx
        .selectFrom('caregiver_links')
        .innerJoin('patient_profiles', 'patient_profiles.user_id', 'caregiver_links.patient_id')
        .select([
          'caregiver_links.link_id',
          'caregiver_links.patient_id',
          'patient_profiles.first_name',
          'patient_profiles.last_name',
          'caregiver_links.status',
          'caregiver_links.linked_at',
        ])
        .where('caregiver_links.caregiver_id', '=', actingUserId)
        .where('caregiver_links.status', '=', CaregiverLinkStatus.LINKED)
        .execute();

      return rows.map((r) => ({
        link_id: r.link_id,
        patient_id: r.patient_id,
        first_name: r.first_name,
        last_name: r.last_name,
        status: r.status as LinkedPatientForCaregiver['status'],
        linked_at: r.linked_at?.toISOString() ?? null,
      }));
    });
  }
}
