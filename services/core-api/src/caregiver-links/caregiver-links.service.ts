import { Inject, Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import {
  findCaregiverLinkByCode,
  findCaregiverLinkByQrPayload,
  redeemCaregiverLink,
  unlinkCaregiverLink,
  withRlsContext,
} from '@sinalytix/db';
import {
  CaregiverLinkStatus,
  type GenerateCaregiverLinkCodeResponse,
  type LinkedPatientForCaregiver,
  type RedeemCaregiverLinkRequest,
} from '@sinalytix/domain';
import { KYSELY } from '../common/db.module';
import { ProblemException } from '../common/problem.exception';
import { randomToken } from '../common/hash.util';
import { RedeemRateLimiter } from '../common/redeem-rate-limiter.service';

const CODE_TTL_SECONDS = 15 * 60; // legacy parity: caregiver code valid 15 minutes
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
      const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000);
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

  /** Either party (patient or caregiver) ends an active link. Authorization
   * is inside the SECURITY DEFINER function (it requires the actor to be one
   * of the two parties); a non-party or already-unlinked link → 404. */
  async unlink(linkId: string, actingUserId: string): Promise<void> {
    await withRlsContext(this.db, { actingUserId }, async (trx) => {
      const result = await unlinkCaregiverLink(trx, linkId, actingUserId);
      if (!result) {
        throw ProblemException.notFound();
      }
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
