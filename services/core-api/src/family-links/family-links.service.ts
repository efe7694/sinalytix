import { Inject, Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import { acceptEcInvite, findFamilyLinkCodeByCode, findFamilyLinkCodeByQrPayload, redeemFamilyLinkCode, withRlsContext } from '@sinalytix/db';
import {
  ConsentCategory,
  FamilyLinkSource,
  FamilyLinkStatus,
  LinkPermissionLevel,
  type GenerateFamilyLinkCodeResponse,
  type LinkedPatientSummary,
  type PatientFamilyLinkPublic,
  type RedeemFamilyLinkRequest,
} from '@sinalytix/domain';
import { KYSELY } from '../common/db.module';
import { ProblemException } from '../common/problem.exception';
import { randomOtpCode, randomToken } from '../common/hash.util';
import { RedeemRateLimiter } from '../common/redeem-rate-limiter.service';
import { ConsentGrantsService } from '../consent-grants/consent-grants.service';
import { SystemConfigService } from '../common/system-config.service';

const REDEEM_NAMESPACE = 'family-link';

// A family member's default access on link activation — deliberately
// minimal (Module 3 §2.2 default-deny philosophy: never lockbox, and here
// not even the other non-lockbox categories) since the Family app's own
// approvals screen already has a "permission_upgrade" request type built
// for widening this later; this is the floor, not the intended steady state.
const FAMILY_BASELINE_SCOPE: string[] = [ConsentCategory.DEMOGRAPHIC];

function toLinkPublic(row: {
  link_id: string;
  patient_id: string;
  family_user_id: string;
  relationship: string;
  status: string;
  permission_level: string;
  source: string;
  emergency_contact_id: string | null;
  baseline_grant_id: string | null;
  linked_at: Date | null;
  created_at: Date;
}): PatientFamilyLinkPublic {
  return {
    link_id: row.link_id,
    patient_id: row.patient_id,
    family_user_id: row.family_user_id,
    relationship: row.relationship,
    status: row.status as PatientFamilyLinkPublic['status'],
    permission_level: row.permission_level as PatientFamilyLinkPublic['permission_level'],
    source: row.source as PatientFamilyLinkPublic['source'],
    emergency_contact_id: row.emergency_contact_id,
    baseline_grant_id: row.baseline_grant_id,
    linked_at: row.linked_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
  };
}

@Injectable()
export class FamilyLinksService {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    private readonly consentGrantsService: ConsentGrantsService,
    private readonly redeemRateLimiter: RedeemRateLimiter,
    private readonly systemConfig: SystemConfigService,
  ) {}

  // ── Patient side: generate / revoke a connect code ──────────────────────

  async generateCode(patientId: string, actingUserId: string): Promise<GenerateFamilyLinkCodeResponse> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      // Replaces any existing active connect code — mirrors the
      // caregiver-link UI's existing "generate a new code replaces the
      // old one" behavior, and required by the one-active-connect-code
      // partial unique index (migration 0011).
      await trx
        .updateTable('family_link_codes')
        .set({ status: 'expired' })
        .where('patient_id', '=', patientId)
        .where('status', '=', 'active')
        .where('source', 'in', ['code', 'qr'])
        .execute();

      const code = randomOtpCode();
      const qrPayload = randomToken(24);
      const expiresAt = new Date(Date.now() + (await this.systemConfig.getMs('link.code_ttl_min', 'min')));
      const row = await trx
        .insertInto('family_link_codes')
        .values({
          patient_id: patientId,
          code,
          qr_payload: qrPayload,
          source: FamilyLinkSource.CODE,
          expires_at: expiresAt,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      // No SMS/push provider wired yet — same dev-only stand-in as
      // auth/otp.service.ts and emergency-contacts.service.ts.
      // eslint-disable-next-line no-console
      console.log(`[dev-only] family-link connect code for patient ${patientId}: ${code} (qr: ${qrPayload})`);

      return {
        link_code_id: row.link_code_id,
        code: row.code,
        qr_payload: row.qr_payload,
        expires_at: expiresAt.toISOString(),
      };
    });
  }

  async revokeCode(patientId: string, actingUserId: string): Promise<void> {
    await withRlsContext(this.db, { actingUserId }, async (trx) => {
      const result = await trx
        .updateTable('family_link_codes')
        .set({ status: 'revoked' })
        .where('patient_id', '=', patientId)
        .where('status', '=', 'active')
        .where('source', 'in', ['code', 'qr'])
        .executeTakeFirst();
      if (Number(result.numUpdatedRows) === 0) {
        throw ProblemException.notFound();
      }
    });
  }

  /** Called from the EmergencyContacts domain (patient side) to (re)send an
   * invite for a specific contact — kept in this module (not
   * emergency-contacts.service.ts) since the code row and redeem logic
   * both live here; Slice 2's already-merged module stays untouched.
   * `patientId` isn't a caller-supplied parameter (unlike Slice 2's
   * patient-scoped create/list/reorder routes) — it comes from the
   * RLS-scoped row itself, matching Slice 2's own ecId-only convention for
   * update/remove/verify-phone (the owner policy already scopes
   * visibility to actingUserId, so trusting a URL patientId here would be
   * redundant at best). */
  async inviteEmergencyContact(ecId: string, actingUserId: string): Promise<GenerateFamilyLinkCodeResponse> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      const ec = await trx
        .selectFrom('emergency_contacts')
        .select(['ec_id', 'patient_id', 'phone'])
        .where('ec_id', '=', ecId)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();
      if (!ec) {
        throw ProblemException.notFound();
      }
      const patientId = ec.patient_id;

      // Replaces any still-active invite for this exact contact — a
      // resend, not a second simultaneous invite (migration 0011's
      // per-EC partial unique index enforces this too; this pre-empts a
      // 409 from that constraint with a cleaner "just replace it").
      await trx
        .updateTable('family_link_codes')
        .set({ status: 'expired' })
        .where('emergency_contact_id', '=', ecId)
        .where('status', '=', 'active')
        .execute();

      const code = randomOtpCode();
      const qrPayload = randomToken(24);
      const expiresAt = new Date(Date.now() + (await this.systemConfig.getMs('link.code_ttl_min', 'min')));
      const row = await trx
        .insertInto('family_link_codes')
        .values({
          patient_id: patientId,
          code,
          qr_payload: qrPayload,
          source: FamilyLinkSource.EC_INVITE,
          emergency_contact_id: ecId,
          expires_at: expiresAt,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      await trx
        .updateTable('emergency_contacts')
        .set({ invite_sent_at: new Date() })
        .where('ec_id', '=', ecId)
        .execute();

      // eslint-disable-next-line no-console
      console.log(`[dev-only] family-link EC invite for ${ec.phone}: ${code} (qr: ${qrPayload})`);

      return {
        link_code_id: row.link_code_id,
        code: row.code,
        qr_payload: row.qr_payload,
        expires_at: expiresAt.toISOString(),
      };
    });
  }

  // ── Family side: redeem ──────────────────────────────────────────────────

  /**
   * Runs entirely as the family member throughout — never switches RLS
   * identity mid-transaction. The ec_invite auto-activation path's baseline
   * grant insert and EC-accept update both rely on the additive RLS
   * policies migration 0012 adds specifically for this (see that
   * migration's comments and ConsentGrantsService.createBaseline()'s doc
   * comment, which anticipated this exact design in Slice 1).
   */
  async redeem(actingUserId: string, body: RedeemFamilyLinkRequest): Promise<PatientFamilyLinkPublic> {
    await this.redeemRateLimiter.assertNotLockedOut(REDEEM_NAMESPACE, actingUserId);

    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      const matchedSource = body.code ? FamilyLinkSource.CODE : FamilyLinkSource.QR;
      const codeRow = body.code
        ? await findFamilyLinkCodeByCode(trx, body.code)
        : await findFamilyLinkCodeByQrPayload(trx, body.qr_payload as string);

      if (!codeRow) {
        return this.redeemRateLimiter.recordFailureAndThrow(REDEEM_NAMESPACE, actingUserId);
      }

      const source = codeRow.source === FamilyLinkSource.EC_INVITE ? FamilyLinkSource.EC_INVITE : matchedSource;
      if (source !== FamilyLinkSource.EC_INVITE && !body.relationship) {
        throw ProblemException.badRequest('relationship alanı zorunludur.');
      }

      const existingLink = await trx
        .selectFrom('patient_family_links')
        .select('link_id')
        .where('patient_id', '=', codeRow.patient_id)
        .where('family_user_id', '=', actingUserId)
        .where('status', '!=', FamilyLinkStatus.REVOKED)
        .executeTakeFirst();
      if (existingLink) {
        throw ProblemException.conflict('Bu hastayla zaten bir bağlantınız var.');
      }

      const redeemedCode = await redeemFamilyLinkCode(trx, codeRow.link_code_id, actingUserId, source);
      if (!redeemedCode) {
        // Someone else redeemed/revoked it in the gap between lookup and
        // this UPDATE — same generic anti-enumeration response.
        return this.redeemRateLimiter.recordFailureAndThrow(REDEEM_NAMESPACE, actingUserId);
      }

      const isEcInvite = source === FamilyLinkSource.EC_INVITE;
      let relationship = body.relationship as string;
      if (isEcInvite) {
        // The patient may have removed this contact between generating the
        // invite and the family member redeeming it — that must roll back
        // the whole transaction (the code un-redeems, no link/grant is
        // created), not partially succeed with a relationship inherited
        // from a contact that no longer exists. `ec_relationship` comes
        // from redeemFamilyLinkCode()'s own join (not a separate query
        // here): at this point the patient_family_links row doesn't exist
        // yet, so the family actor has no RLS-granted SELECT visibility
        // into this EC row at all (emergency_contacts_family_select
        // requires an already-active link) — see that migration's comment.
        if (redeemedCode.ec_relationship === null) {
          throw ProblemException.conflict('Davet artık geçerli değil.');
        }
        relationship = redeemedCode.ec_relationship;
      }

      const link = await trx
        .insertInto('patient_family_links')
        .values({
          patient_id: codeRow.patient_id,
          family_user_id: actingUserId,
          relationship,
          status: isEcInvite ? FamilyLinkStatus.ACTIVE : FamilyLinkStatus.PENDING_PATIENT_CONFIRM,
          permission_level: LinkPermissionLevel.VIEW,
          source,
          emergency_contact_id: codeRow.emergency_contact_id,
          linked_at: isEcInvite ? new Date() : null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      if (isEcInvite) {
        const grant = await this.consentGrantsService.createBaseline(trx, {
          patientId: codeRow.patient_id,
          familyUserId: actingUserId,
          grantedBy: codeRow.patient_id,
          scope: FAMILY_BASELINE_SCOPE,
        });
        await trx.updateTable('patient_family_links').set({ baseline_grant_id: grant.grant_id }).where('link_id', '=', link.link_id).execute();
        // Narrow accept-write via SECURITY DEFINER (no family UPDATE policy on
        // emergency_contacts exists — that would over-grant the general edit
        // path; see migration 0012). Args are server-derived, not client input.
        await acceptEcInvite(trx, codeRow.emergency_contact_id as string, actingUserId);
        return toLinkPublic({ ...link, baseline_grant_id: grant.grant_id });
      }

      return toLinkPublic(link);
    });
  }

  /** Patient-initiated: activates a `pending_patient_confirm` link (the
   * code/qr path) — the atomic activate+grant step ec_invite gets for
   * free at redeem time. */
  async confirm(linkId: string, actingUserId: string): Promise<PatientFamilyLinkPublic> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      // Deliberately not filtered by `patient_id = actingUserId` here —
      // RLS's own patient_family_links_select policy already makes this
      // row visible to *either* side. Filtering it out at the query level
      // would collapse "visible but you're the wrong party to confirm"
      // (family member trying to confirm their own pending link — a real,
      // distinguishable 403) into the same generic 404 a total stranger
      // gets, losing information the API contract is meant to expose.
      const link = await trx.selectFrom('patient_family_links').selectAll().where('link_id', '=', linkId).executeTakeFirst();
      if (!link) {
        throw ProblemException.notFound();
      }
      if (link.patient_id !== actingUserId) {
        throw ProblemException.forbidden('Bu bağlantıyı yalnız hasta onaylayabilir.');
      }
      if (link.status !== FamilyLinkStatus.PENDING_PATIENT_CONFIRM) {
        throw ProblemException.conflict('Bu bağlantı zaten onaylanmış veya iptal edilmiş.');
      }

      const updated = await trx
        .updateTable('patient_family_links')
        .set({ status: FamilyLinkStatus.ACTIVE, linked_at: new Date() })
        .where('link_id', '=', linkId)
        .returningAll()
        .executeTakeFirstOrThrow();

      const grant = await this.consentGrantsService.createBaseline(trx, {
        patientId: actingUserId,
        familyUserId: link.family_user_id,
        grantedBy: actingUserId,
        scope: FAMILY_BASELINE_SCOPE,
      });
      await trx.updateTable('patient_family_links').set({ baseline_grant_id: grant.grant_id }).where('link_id', '=', linkId).execute();

      return toLinkPublic({ ...updated, baseline_grant_id: grant.grant_id });
    });
  }

  /** Either side may unlink. Cascades the baseline grant's revoke in the
   * same transaction via `revokeWithTrx` (never the public `revoke()`,
   * which opens its own transaction — see that method's doc comment). */
  async revokeLink(linkId: string, actingUserId: string): Promise<void> {
    await withRlsContext(this.db, { actingUserId }, async (trx) => {
      const link = await trx
        .selectFrom('patient_family_links')
        .selectAll()
        .where('link_id', '=', linkId)
        .where(({ eb, or }) => or([eb('patient_id', '=', actingUserId), eb('family_user_id', '=', actingUserId)]))
        .executeTakeFirst();
      if (!link || link.status === FamilyLinkStatus.REVOKED) {
        throw ProblemException.notFound();
      }

      await trx
        .updateTable('patient_family_links')
        .set({ status: FamilyLinkStatus.REVOKED, revoked_at: new Date(), revoked_by: actingUserId })
        .where('link_id', '=', linkId)
        .execute();

      if (link.baseline_grant_id) {
        await this.consentGrantsService.revokeWithTrx(trx, link.baseline_grant_id, actingUserId);
      }
    });
  }

  // ── Family side: roster ──────────────────────────────────────────────────

  async listMyLinks(actingUserId: string): Promise<LinkedPatientSummary[]> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      const rows = await trx
        .selectFrom('patient_family_links')
        .innerJoin('patient_profiles', 'patient_profiles.user_id', 'patient_family_links.patient_id')
        .select([
          'patient_family_links.patient_id',
          'patient_profiles.first_name',
          'patient_profiles.last_name',
          'patient_family_links.relationship',
          'patient_family_links.permission_level',
          'patient_family_links.linked_at',
        ])
        .where('patient_family_links.family_user_id', '=', actingUserId)
        .where('patient_family_links.status', '=', FamilyLinkStatus.ACTIVE)
        .execute();

      return rows.map((row) => ({
        patient_id: row.patient_id,
        first_name: row.first_name,
        last_name: row.last_name,
        relationship: row.relationship,
        permission_level: row.permission_level as LinkedPatientSummary['permission_level'],
        linked_at: row.linked_at?.toISOString() ?? null,
      }));
    });
  }
}
