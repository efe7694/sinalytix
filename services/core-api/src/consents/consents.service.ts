import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import { withRlsContext } from '@sinalytix/db';
import type {
  ConsentFlag,
  ConsentRecordPublic,
  CreateConsentRecordRequest,
  EffectiveConsent,
} from '@sinalytix/domain';
import { KYSELY } from '../common/db.module';
import { ApiException } from '../common/api.exception';

export interface ConsentActor {
  userId: string;
  roles: string[];
  appContext: string;
}

/**
 * `ConsentRecord` — the immutable legal/ToS layer (Modül 2 §3.2, Sözlük §2).
 * Distinct from `ConsentGrant`: this one is append-only and can never be
 * edited or withdrawn, only superseded by a newer record.
 *
 * The table shipped in Faz 0 (migration 0004) but had NO endpoints, so
 * nothing could actually record a consent — DEVIATIONS D15 item B4.
 */
@Injectable()
export class ConsentsService {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  /**
   * Writes a consent record. `user_id`, `server_recorded_at` and `ip_hash`
   * are all **server-derived** (Modül 2 §3.2) — a client cannot claim consent
   * on someone else's behalf by putting a different id in the body, and it
   * cannot backdate the server's own record of when it arrived.
   * `consented_at` IS client-supplied on purpose: it is the moment the human
   * tapped accept, which may precede the request (offline onboarding).
   */
  async create(
    actor: ConsentActor,
    body: CreateConsentRecordRequest,
    ipHash: string | undefined,
  ): Promise<ConsentRecordPublic> {
    const subjectUserId = this.resolveSubject(actor, body);

    // consent_id + server_recorded_at are generated app-side and the INSERT
    // runs WITHOUT `RETURNING`. This is not a style choice — it is required for
    // the C17a on-behalf path: `resolveSubject` sets `user_id` to the PATIENT,
    // but migration 0004's SELECT policy is `user_id = app_acting_user_id()`
    // (the clinician). Postgres re-checks the SELECT policy against the row a
    // `RETURNING` would emit, and that row (patient-owned) fails it — so a
    // `RETURNING` insert 500s and records nothing (independent review S3-1;
    // the same RETURNING-re-checks-SELECT trap as DEVIATIONS D7/D15.4b).
    // Generating both fields here sidesteps the read entirely. `server_recorded_at`
    // is the API server's own clock, which IS the server-recording time the
    // field means (Modül 1 §4.1) — no fidelity is lost versus the DB default.
    const consentId = randomUUID();
    const serverRecordedAt = new Date();

    await withRlsContext(
      this.db,
      { actingUserId: actor.userId, appContext: actor.appContext, actingRoles: actor.roles },
      async (trx) => {
        await trx
          .insertInto('consent_records')
          .values({
            consent_id: consentId,
            user_id: subjectUserId,
            app_context: body.app_context,
            version: body.version,
            recorded_channel: body.recorded_channel,
            flags: body.flags,
            consented_at: new Date(body.consented_at),
            server_recorded_at: serverRecordedAt,
            ip_hash: ipHash ?? null,
          })
          .execute();
      },
    );

    return { consent_id: consentId, server_recorded_at: serverRecordedAt.toISOString() };
  }

  /**
   * C17a — a clinician/nurse may record consent for a patient who has no app
   * account yet, but ONLY through `recorded_channel=clinician_recorded`
   * (matching migration 0004's INSERT policy). Checked here as well as in
   * RLS so the refusal is a clear 403 rather than an opaque policy violation,
   * and so the rule survives any future change to that policy.
   */
  private resolveSubject(actor: ConsentActor, body: CreateConsentRecordRequest): string {
    if (!body.on_behalf_of_patient_id) return actor.userId;

    const isClinician = actor.roles.includes('clinician') || actor.roles.includes('nurse');
    if (!isClinician || body.recorded_channel !== 'clinician_recorded') {
      throw ApiException.permissionDenied('consent.record_on_behalf_clinician_only');
    }
    return body.on_behalf_of_patient_id;
  }

  /** Full history, newest first. Immutable, so this is an audit trail as much
   * as a read — a user can always see every version they ever accepted. */
  async listForActor(actor: ConsentActor): Promise<ConsentRecordHistoryEntry[]> {
    return withRlsContext(
      this.db,
      { actingUserId: actor.userId, appContext: actor.appContext, actingRoles: actor.roles },
      async (trx) => {
        const rows = await trx
          .selectFrom('consent_records')
          .select(['consent_id', 'app_context', 'version', 'recorded_channel', 'flags', 'consented_at', 'server_recorded_at'])
          .where('user_id', '=', actor.userId)
          .orderBy('server_recorded_at', 'desc')
          .execute();
        return rows.map((r) => ({
          consent_id: r.consent_id,
          app_context: r.app_context,
          version: r.version,
          recorded_channel: r.recorded_channel,
          flags: r.flags as Record<string, boolean>,
          consented_at: r.consented_at.toISOString(),
          server_recorded_at: r.server_recorded_at.toISOString(),
        }));
      },
    );
  }

  /**
   * The newest record per `app_context` — see `EffectiveConsent` for why
   * flags are taken from the newest record rather than merged across
   * versions (a union would resurrect a withdrawn acknowledgement).
   */
  async effectiveForActor(actor: ConsentActor): Promise<EffectiveConsent[]> {
    const history = await this.listForActor(actor);
    const newestPerContext = new Map<string, ConsentRecordHistoryEntry>();
    for (const entry of history) {
      // History is already newest-first, so the first hit per context wins.
      if (!newestPerContext.has(entry.app_context)) newestPerContext.set(entry.app_context, entry);
    }
    return [...newestPerContext.values()].map((e) => ({
      app_context: e.app_context as EffectiveConsent['app_context'],
      version: e.version,
      consented_at: e.consented_at,
      flags: e.flags as EffectiveConsent['flags'],
    }));
  }

  /**
   * Single source of truth for "does this user currently hold flag X?" —
   * the shape every gate needs (B9: `ack_ai_processing` is checked before any
   * AI surface runs, Modül 4 §1 step 1). Kept here rather than re-derived at
   * each gate so "latest record wins" is decided exactly once.
   */
  async hasFlag(actor: ConsentActor, flag: ConsentFlag, appContext?: string): Promise<boolean> {
    const effective = await this.effectiveForActor(actor);
    return effective.some(
      (e) => (appContext === undefined || e.app_context === appContext) && e.flags[flag] === true,
    );
  }
}

export interface ConsentRecordHistoryEntry {
  consent_id: string;
  app_context: string;
  version: string;
  recorded_channel: string;
  flags: Record<string, boolean>;
  consented_at: string;
  server_recorded_at: string;
}
