import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import { withRlsContext } from '@sinalytix/db';
import {
  GrantedToKind,
  Permission,
  type ConsentGrantPublic,
  type CreateConsentGrantRequest,
  type CreateSdmDeclarationRequest,
  type PaginatedResponse,
  type SdmDeclarationPublic,
} from '@sinalytix/domain';
import { isLockboxCategory } from '@sinalytix/policy-engine';
import { KYSELY } from '../common/db.module';
import { ApiException } from '../common/api.exception';
import { buildPaginatedResponse, decodeCursor } from '../common/cursor-pagination';

function toConsentGrantPublic(row: {
  grant_id: string;
  patient_id: string;
  granted_to_kind: string;
  granted_to_id: string;
  scope: unknown;
  permission: string;
  period_start: Date | null;
  period_end: Date | null;
  granted_by: string;
  revoked_at: Date | null;
  created_at: Date;
}): ConsentGrantPublic {
  return {
    grant_id: row.grant_id,
    patient_id: row.patient_id,
    granted_to_kind: row.granted_to_kind as ConsentGrantPublic['granted_to_kind'],
    granted_to_id: row.granted_to_id,
    scope: row.scope as string[],
    permission: row.permission as ConsentGrantPublic['permission'],
    period_start: row.period_start?.toISOString() ?? null,
    period_end: row.period_end?.toISOString() ?? null,
    granted_by: row.granted_by,
    revoked_at: row.revoked_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
  };
}

@Injectable()
export class ConsentGrantsService {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  /** Module 3 §2.2: only the patient or an active SDM may create a grant on
   * the patient's own behalf; a `family_member`-kind grant is system-only
   * (written by `createBaseline`, called from the family-link activation
   * flow — Faz 1 Slice 3), never directly via this endpoint. */
  async create(patientId: string, actingUserId: string, body: CreateConsentGrantRequest): Promise<ConsentGrantPublic> {
    if (body.granted_to_kind === GrantedToKind.FAMILY_MEMBER) {
      throw ApiException.conflict('consent.family_grant_system_only');
    }

    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      await this.assertCanActOnPatient(trx, patientId, actingUserId);

      const grantId = randomUUID();
      const row = await trx
        .insertInto('consent_grants')
        .values({
          grant_id: grantId,
          patient_id: patientId,
          granted_to_kind: body.granted_to_kind,
          granted_to_id: body.granted_to_id,
          scope: JSON.stringify(body.scope),
          permission: body.permission,
          period_start: body.period_start ?? null,
          period_end: body.period_end ?? null,
          granted_by: actingUserId,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return toConsentGrantPublic(row);
    });
  }

  async list(
    patientId: string,
    actingUserId: string,
    query: { cursor?: string; limit: number },
  ): Promise<PaginatedResponse<ConsentGrantPublic>> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      let q = trx.selectFrom('consent_grants').selectAll().where('patient_id', '=', patientId);

      if (query.cursor) {
        const decoded = decodeCursor(query.cursor);
        q = q.where(({ eb, or, and }) =>
          or([
            eb('created_at', '<', new Date(decoded.createdAt)),
            and([eb('created_at', '=', new Date(decoded.createdAt)), eb('grant_id', '<', decoded.id)]),
          ]),
        );
      }

      const rows = await q
        .orderBy('created_at', 'desc')
        .orderBy('grant_id', 'desc')
        .limit(query.limit + 1)
        .execute();

      return buildPaginatedResponse(rows.map(toConsentGrantPublic), query.limit, (item) => ({
        createdAt: new Date(item.created_at),
        id: item.grant_id,
      }));
    });
  }

  /** 202 per Module 2 §3.2 — revocation is a fire-and-cascade operation
   * (PolicyEngine cache + WS unsubscribe within ≤5sn, Modül 3 §2.4), not
   * something this call waits on synchronously. Idempotency-Key replay of
   * an already-processed revoke is handled entirely by
   * `IdempotencyInterceptor` before this method ever runs — a *new* key
   * hitting an already-revoked grant is a genuine conflict, always 409. */
  async revoke(grantId: string, actingUserId: string): Promise<{ grant_id: string; revoked_at: string }> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      const existing = await trx
        .selectFrom('consent_grants')
        .select(['grant_id', 'revoked_at'])
        .where('grant_id', '=', grantId)
        .executeTakeFirst();
      if (!existing) {
        throw ApiException.notFound();
      }
      if (existing.revoked_at) {
        throw ApiException.conflict('consent.grant_already_revoked');
      }

      const revokedAt = new Date();
      const updated = await trx
        .updateTable('consent_grants')
        .set({ revoked_at: revokedAt, revoked_by: actingUserId })
        .where('grant_id', '=', grantId)
        .returning(['grant_id', 'revoked_at'])
        .executeTakeFirst();
      if (!updated) {
        // RLS silently dropped the UPDATE (not the patient, not an active SDM) —
        // varlık-sızdırmaz: same 404 as "doesn't exist", not a 403.
        throw ApiException.notFound();
      }
      return { grant_id: updated.grant_id, revoked_at: revokedAt.toISOString() };
    });
  }

  /**
   * Faz 1 Slice 3's family-link activation composes this into its own
   * transaction (`trx` — not opened here). Lockbox categories are stripped
   * defensively even if a caller passed one by mistake — a baseline grant
   * must never carry lockbox scope (Dictionary C13), and this is the single
   * choke point that guarantees it regardless of what the caller sends.
   *
   * NOTE: the current `consent_grants_direct_insert` RLS policy (0009) only
   * covers the patient/SDM-as-actor case. The family-link redeem flow's
   * ec_invite path calls this with the *family member* as `app_acting_user_id()`
   * — that path only becomes insertable once Slice 3's migration adds the
   * third INSERT policy referencing `patient_family_links` (see 0009's
   * top-of-file comment). This method is correct and ready; it isn't fully
   * exercisable end-to-end until that policy lands.
   */
  async createBaseline(
    trx: Kysely<Database>,
    input: { patientId: string; familyUserId: string; grantedBy: string; scope: string[] },
  ): Promise<{ grant_id: string }> {
    const nonLockboxScope = input.scope.filter((category) => !isLockboxCategory(category));
    const grantId = randomUUID();
    const row = await trx
      .insertInto('consent_grants')
      .values({
        grant_id: grantId,
        patient_id: input.patientId,
        granted_to_kind: GrantedToKind.FAMILY_MEMBER,
        granted_to_id: input.familyUserId,
        scope: JSON.stringify(nonLockboxScope),
        permission: Permission.PERMIT,
        granted_by: input.grantedBy,
      })
      .returning(['grant_id'])
      .executeTakeFirstOrThrow();
    return { grant_id: row.grant_id };
  }

  /**
   * Faz 1 Slice 3's family-link unlink/revoke composes this into its own
   * transaction (`trx` — not opened here), for the same reason
   * `createBaseline` above does: cascading a baseline grant's revoke must be
   * atomic with the `patient_family_links` status update, and calling the
   * public `revoke()` method here would open a second, unrelated
   * transaction blind to this one's still-uncommitted writes (the exact
   * nested-`withRlsContext` bug found and fixed in Faz 1 Slice 2 — see
   * DEVIATIONS.md D11). No-ops if the grant is already revoked or doesn't
   * exist — the caller (an unlink flow) doesn't need this to be an error
   * case, unlike the public endpoint's `revoke()`.
   */
  async revokeWithTrx(trx: Kysely<Database>, grantId: string, revokedBy: string): Promise<void> {
    await trx
      .updateTable('consent_grants')
      .set({ revoked_at: new Date(), revoked_by: revokedBy })
      .where('grant_id', '=', grantId)
      .where('revoked_at', 'is', null)
      .execute();
  }

  async createSdmDeclaration(
    patientId: string,
    actingUserId: string,
    roles: string[],
    body: CreateSdmDeclarationRequest,
  ): Promise<SdmDeclarationPublic> {
    if (!roles.includes('clinician') && !roles.includes('nurse')) {
      throw ApiException.permissionDenied('consent.sdm_clinician_only');
    }

    return withRlsContext(this.db, { actingUserId, actingRoles: roles }, async (trx) => {
      const existing = await trx
        .selectFrom('sdm_declarations')
        .select('sdm_declaration_id')
        .where('patient_id', '=', patientId)
        .where('sdm_user_id', '=', body.sdm_user_id)
        .executeTakeFirst();
      if (existing) {
        throw ApiException.conflict('consent.sdm_duplicate');
      }

      const row = await trx
        .insertInto('sdm_declarations')
        .values({
          patient_id: patientId,
          sdm_user_id: body.sdm_user_id,
          province_rule: body.province_rule,
          poa_document_id: body.poa_document_id ?? null,
          active: true,
          activated_by: actingUserId,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return {
        sdm_declaration_id: row.sdm_declaration_id,
        patient_id: row.patient_id,
        sdm_user_id: row.sdm_user_id,
        province_rule: row.province_rule as 'ON_HCCA',
        active: row.active,
        activated_by: row.activated_by,
        created_at: row.created_at.toISOString(),
      };
    });
  }

  async listSdmDeclarations(
    patientId: string,
    actingUserId: string,
    roles: string[],
    query: { cursor?: string; limit: number },
  ): Promise<PaginatedResponse<SdmDeclarationPublic>> {
    return withRlsContext(this.db, { actingUserId, actingRoles: roles }, async (trx) => {
      let q = trx.selectFrom('sdm_declarations').selectAll().where('patient_id', '=', patientId);

      if (query.cursor) {
        const decoded = decodeCursor(query.cursor);
        q = q.where(({ eb, or, and }) =>
          or([
            eb('created_at', '<', new Date(decoded.createdAt)),
            and([eb('created_at', '=', new Date(decoded.createdAt)), eb('sdm_declaration_id', '<', decoded.id)]),
          ]),
        );
      }

      const rows = await q
        .orderBy('created_at', 'desc')
        .orderBy('sdm_declaration_id', 'desc')
        .limit(query.limit + 1)
        .execute();

      return buildPaginatedResponse(
        rows.map((row) => ({
          sdm_declaration_id: row.sdm_declaration_id,
          patient_id: row.patient_id,
          sdm_user_id: row.sdm_user_id,
          province_rule: row.province_rule as 'ON_HCCA',
          active: row.active,
          activated_by: row.activated_by,
          created_at: row.created_at.toISOString(),
        })),
        query.limit,
        (item) => ({ createdAt: new Date(item.created_at), id: item.sdm_declaration_id }),
      );
    });
  }

  private async assertCanActOnPatient(trx: Kysely<Database>, patientId: string, actingUserId: string): Promise<void> {
    if (patientId === actingUserId) return;
    const activeSdm = await trx
      .selectFrom('sdm_declarations')
      .select('sdm_declaration_id')
      .where('patient_id', '=', patientId)
      .where('sdm_user_id', '=', actingUserId)
      .where('active', '=', true)
      .executeTakeFirst();
    if (!activeSdm) {
      throw ApiException.permissionDenied('consent.patient_or_sdm_only');
    }
  }
}
