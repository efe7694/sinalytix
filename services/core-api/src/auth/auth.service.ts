import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import {
  findRefreshTokenByHash,
  findUserByEmail,
  findUserByOauthSubject,
  findUserByPhone,
  setRlsVar,
  withRlsContext,
} from '@sinalytix/db';
import { sessionPolicyFor } from '@sinalytix/config';
import {
  AppContext,
  AuthMethod,
  Platform,
  Role,
  UserStatus,
  type AuthResult,
  type BackupCodesResult,
  type LoginRequest,
  type SessionPublic,
  type SignupRequest,
  type TokenPair,
  type TotpEnrollResult,
} from '@sinalytix/domain';
import { writeAuditLog } from '@sinalytix/audit';
import { KYSELY } from '../common/db.module';
import { ProblemException } from '../common/problem.exception';
import { randomToken, sha256Hex } from '../common/hash.util';
import { ColumnEncryptionService } from '../common/encryption.util';
import { TokenService } from './token.service';
import { OtpService } from './otp.service';
import { TotpService } from './totp.service';
import { PasswordService } from './password.service';
import { AppleIdTokenVerifier, GoogleIdTokenVerifier, type IdTokenVerifier } from './id-token-verifier';
import { ProfileService } from './profile.service';

export interface RequestMeta {
  platform: string;
  deviceLabel?: string;
  ipHash?: string;
  uaHash?: string;
}



interface IssuedSession {
  session_id: string;
  access_token: string;
  expires_in: number;
  refresh_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    private readonly tokenService: TokenService,
    private readonly otpService: OtpService,
    private readonly totpService: TotpService,
    private readonly passwordService: PasswordService,
    private readonly encryptionService: ColumnEncryptionService,
    private readonly appleVerifier: AppleIdTokenVerifier,
    private readonly googleVerifier: GoogleIdTokenVerifier,
    private readonly profileService: ProfileService,
  ) {}

  // ── Session/token issuance (shared by signup/otp-verify/login/mfa) ─────

  /**
   * K9/A4: the concurrency cap is per-`app_context`, not global — an admin
   * gets 2, everyone else 5 (`SESSION_POLICY`, @sinalytix/config). The count
   * is scoped to the SAME app_context for the same reason the cap differs:
   * sessions are per-app (no SSO until V2), so a patient logging in on their
   * phone must not evict their own admin console session, or vice versa.
   */
  private async enforceSessionLimit(trx: Kysely<Database>, userId: string, appContext: string): Promise<void> {
    const maxConcurrent = sessionPolicyFor(appContext).maxConcurrent;
    const active = await trx
      .selectFrom('sessions')
      .select(['session_id'])
      .where('user_id', '=', userId)
      .where('app_context', '=', appContext)
      .where('revoked_at', 'is', null)
      .orderBy('created_at', 'asc')
      .execute();
    if (active.length >= maxConcurrent) {
      const toRevoke = active.slice(0, active.length - (maxConcurrent - 1));
      for (const s of toRevoke) {
        await trx
          .updateTable('sessions')
          .set({ revoked_at: new Date(), revoke_reason: 'session_limit_exceeded' })
          .where('session_id', '=', s.session_id)
          .execute();
      }
    }
  }

  private async issueSession(
    trx: Kysely<Database>,
    params: { userId: string; roles: string[]; appContext: string; meta: RequestMeta },
  ): Promise<IssuedSession> {
    await this.enforceSessionLimit(trx, params.userId, params.appContext);
    const policy = sessionPolicyFor(params.appContext);
    const now = Date.now();
    const session = await trx
      .insertInto('sessions')
      .values({
        user_id: params.userId,
        app_context: params.appContext,
        platform: params.meta.platform,
        device_label: params.meta.deviceLabel ?? null,
        max_at: new Date(now + policy.absoluteMs),
        idle_at: new Date(now + policy.idleMs),
        ip_hash: params.meta.ipHash ?? null,
        ua_hash: params.meta.uaHash ?? null,
      })
      .returning(['session_id'])
      .executeTakeFirstOrThrow();

    const refreshTokenRaw = randomToken();
    await trx
      .insertInto('refresh_tokens')
      .values({ session_id: session.session_id, token_hash: sha256Hex(refreshTokenRaw) })
      .execute();

    const accessToken = this.tokenService.signAccessToken({
      sub: params.userId,
      session_id: session.session_id,
      app_context: params.appContext,
      roles: params.roles,
    });

    return {
      session_id: session.session_id,
      access_token: accessToken,
      expires_in: this.tokenService.accessTokenTtlSeconds,
      refresh_token: refreshTokenRaw,
    };
  }

  private toAuthResult(issued: IssuedSession, userId: string, status: string, appContext: string, platform: string): AuthResult {
    return {
      access_token: issued.access_token,
      expires_in: issued.expires_in,
      refresh_token: issued.refresh_token,
      user_id: userId,
      status: status as UserStatus,
      session: { session_id: issued.session_id, app_context: appContext as AppContext, platform: platform as Platform },
    };
  }

  /** Faz 0 default: patient/family/caregiver app_context implies that role
   * 1:1 at signup; HCP roles are assigned via org provisioning (C17b, Faz 5)
   * so stay empty here — see DEVIATIONS.md D6. */
  private initialRoles(appContext: string): string[] {
    return appContext === AppContext.HCP ? [] : [appContext as Role];
  }

  // ── Signup ───────────────────────────────────────────────────────────

  async signup(req: SignupRequest, meta: RequestMeta): Promise<AuthResult> {
    if (req.auth_method === AuthMethod.EMAIL_PASSWORD) {
      return this.signupEmailPassword(req, meta);
    }
    if (req.auth_method === AuthMethod.APPLE_SSO || req.auth_method === AuthMethod.GOOGLE_SSO) {
      if (!req.id_token) throw ProblemException.badRequest('id_token zorunlu.');
      return this.ssoAuth(req.auth_method, req.id_token, req.app_context, meta);
    }
    throw ProblemException.badRequest('phone_otp icin /auth/otp/request ve /auth/otp/verify kullanin.');
  }

  private async signupEmailPassword(req: SignupRequest, meta: RequestMeta): Promise<AuthResult> {
    if (req.app_context !== AppContext.HCP) {
      throw ProblemException.badRequest('email_password yalnız HCP uygulaması için kullanılabilir.');
    }
    if (!req.email || !req.password) {
      throw ProblemException.badRequest('email ve password zorunlu.');
    }

    return withRlsContext(this.db, {}, async (trx) => {
      const existing = await findUserByEmail(trx, req.email as string);
      if (existing) {
        throw ProblemException.conflict('Bu e-posta zaten kayıtlı.');
      }
      const passwordHash = await this.passwordService.hash(req.password as string);
      // user_id generated client-side and the RLS var set *before* insert:
      // Postgres re-checks the SELECT policy for RETURNING after INSERT, not
      // just the INSERT policy's WITH CHECK — a DB-generated id would fail
      // that SELECT check since acting_user_id can't match it in advance.
      const newUserId = randomUUID();
      await setRlsVar(trx, 'app.acting_user_id', newUserId);
      const created = await trx
        .insertInto('users')
        .values({
          user_id: newUserId,
          email: req.email as string,
          auth_methods: [AuthMethod.EMAIL_PASSWORD],
          password_hash: passwordHash,
          status: UserStatus.INCOMPLETE,
          roles: this.initialRoles(req.app_context),
        })
        .returning(['user_id', 'status', 'roles'])
        .executeTakeFirstOrThrow();

      const issued = await this.issueSession(trx, {
        userId: created.user_id,
        roles: created.roles,
        appContext: req.app_context,
        meta,
      });

      await writeAuditLog(trx, {
        eventType: 'auth.signup',
        eventCategory: 'auth',
        eventSeverity: 'info',
        userId: created.user_id,
        actingUserId: created.user_id,
        sessionId: issued.session_id,
        ipHash: meta.ipHash,
        uaHash: meta.uaHash,
        eventData: { auth_method: req.auth_method, app_context: req.app_context },
      });

      return this.toAuthResult(issued, created.user_id, created.status, req.app_context, meta.platform);
    });
  }

  private async ssoAuth(
    method: typeof AuthMethod.APPLE_SSO | typeof AuthMethod.GOOGLE_SSO,
    idToken: string,
    appContext: string,
    meta: RequestMeta,
  ): Promise<AuthResult> {
    const verifier: IdTokenVerifier = method === AuthMethod.APPLE_SSO ? this.appleVerifier : this.googleVerifier;
    const identity = await verifier.verify(idToken);

    return withRlsContext(this.db, {}, async (trx) => {
      const existing = await findUserByOauthSubject(trx, method, identity.subject);

      let userId: string;
      let status: string;
      let roles: string[];

      if (existing) {
        userId = existing.user_id;
        status = existing.status;
        roles = existing.roles;
      } else {
        const newUserId = randomUUID();
        await setRlsVar(trx, 'app.acting_user_id', newUserId);
        const created = await trx
          .insertInto('users')
          .values({
            user_id: newUserId,
            email: identity.email ?? null,
            email_verified: Boolean(identity.email),
            auth_methods: [method],
            status: UserStatus.INCOMPLETE,
            roles: this.initialRoles(appContext),
          })
          .returning(['user_id', 'status', 'roles'])
          .executeTakeFirstOrThrow();
        userId = created.user_id;
        status = created.status;
        roles = created.roles;
        await trx
          .insertInto('oauth_identities')
          .values({ user_id: userId, provider: method, provider_subject: identity.subject })
          .execute();
        await this.profileService.createDefaultProfile(trx, userId, appContext);
      }

      await setRlsVar(trx, 'app.acting_user_id', userId);
      const issued = await this.issueSession(trx, { userId, roles, appContext, meta });

      await writeAuditLog(trx, {
        eventType: existing ? 'auth.login' : 'auth.signup',
        eventCategory: 'auth',
        eventSeverity: 'info',
        userId,
        actingUserId: userId,
        sessionId: issued.session_id,
        ipHash: meta.ipHash,
        uaHash: meta.uaHash,
        eventData: { auth_method: method, app_context: appContext },
      });

      return this.toAuthResult(issued, userId, status, appContext, meta.platform);
    });
  }

  // ── Login (email_password only diverges from signup — see D6) ─────────

  async login(req: LoginRequest, meta: RequestMeta): Promise<AuthResult> {
    if (req.auth_method === AuthMethod.APPLE_SSO || req.auth_method === AuthMethod.GOOGLE_SSO) {
      if (!req.id_token) throw ProblemException.badRequest('id_token zorunlu.');
      return this.ssoAuth(req.auth_method, req.id_token, req.app_context, meta);
    }

    if (!req.email || !req.password) {
      throw ProblemException.badRequest('email ve password zorunlu.');
    }
    return withRlsContext(this.db, {}, async (trx) => {
      const found = await findUserByEmail(trx, req.email as string);
      if (!found || !found.password_hash || !(await this.passwordService.verify(found.password_hash, req.password as string))) {
        throw ProblemException.unauthorized('E-posta veya şifre hatalı.');
      }

      // Credentials verified — set acting_user_id now so the totp_secrets
      // check below (and the session/refresh-token inserts further down)
      // are actually visible under RLS, not just the bootstrap-exempt path.
      await setRlsVar(trx, 'app.acting_user_id', found.user_id);

      const hasMfa = await trx
        .selectFrom('totp_secrets')
        .select(['user_id'])
        .where('user_id', '=', found.user_id)
        .where('confirmed_at', 'is not', null)
        .executeTakeFirst();

      if (hasMfa) {
        const mfaToken = this.tokenService.signAccessToken({
          sub: found.user_id,
          session_id: 'mfa-pending',
          app_context: req.app_context,
          roles: found.roles,
        });
        return {
          user_id: found.user_id,
          status: found.status as AuthResult['status'],
          mfa_required: true,
          mfa_token: mfaToken,
        };
      }

      const issued = await this.issueSession(trx, {
        userId: found.user_id,
        roles: found.roles,
        appContext: req.app_context,
        meta,
      });
      await writeAuditLog(trx, {
        eventType: 'auth.login',
        eventCategory: 'auth',
        eventSeverity: 'info',
        userId: found.user_id,
        actingUserId: found.user_id,
        sessionId: issued.session_id,
        ipHash: meta.ipHash,
        uaHash: meta.uaHash,
        eventData: { auth_method: req.auth_method, app_context: req.app_context },
      });
      return this.toAuthResult(issued, found.user_id, found.status, req.app_context, meta.platform);
    });
  }

  // ── Phone OTP (find-or-create on verify — see D6) ───────────────────────

  async requestOtp(phoneE164: string): Promise<void> {
    await this.otpService.requestCode(phoneE164);
  }

  async verifyOtp(phoneE164: string, code: string, appContext: string, meta: RequestMeta): Promise<AuthResult> {
    const ok = await this.otpService.verifyCode(phoneE164, code);
    if (!ok) {
      throw ProblemException.unauthorized('Kod geçersiz veya süresi dolmuş.');
    }

    return withRlsContext(this.db, {}, async (trx) => {
      const existing = await findUserByPhone(trx, phoneE164);
      let userId: string;
      let status: string;
      let roles: string[];

      if (existing) {
        userId = existing.user_id;
        status = existing.status;
        roles = existing.roles;
        await setRlsVar(trx, 'app.acting_user_id', userId);
        if (!existing.auth_methods.includes(AuthMethod.PHONE_OTP)) {
          await trx
            .updateTable('users')
            .set({ auth_methods: [...existing.auth_methods, AuthMethod.PHONE_OTP], phone_verified: true })
            .where('user_id', '=', userId)
            .execute();
        }
      } else {
        const newUserId = randomUUID();
        await setRlsVar(trx, 'app.acting_user_id', newUserId);
        const created = await trx
          .insertInto('users')
          .values({
            user_id: newUserId,
            phone_e164: phoneE164,
            phone_verified: true,
            auth_methods: [AuthMethod.PHONE_OTP],
            status: UserStatus.INCOMPLETE,
            roles: this.initialRoles(appContext),
          })
          .returning(['user_id', 'status', 'roles'])
          .executeTakeFirstOrThrow();
        userId = created.user_id;
        status = created.status;
        roles = created.roles;
        await setRlsVar(trx, 'app.acting_user_id', userId);
        await this.profileService.createDefaultProfile(trx, userId, appContext);
      }

      const issued = await this.issueSession(trx, { userId, roles, appContext, meta });
      await writeAuditLog(trx, {
        eventType: existing ? 'auth.login' : 'auth.signup',
        eventCategory: 'auth',
        eventSeverity: 'info',
        userId,
        actingUserId: userId,
        sessionId: issued.session_id,
        ipHash: meta.ipHash,
        uaHash: meta.uaHash,
        eventData: { auth_method: 'phone_otp', app_context: appContext },
      });
      return this.toAuthResult(issued, userId, status, appContext, meta.platform);
    });
  }

  // ── MFA (TOTP) ───────────────────────────────────────────────────────

  async totpEnroll(userId: string): Promise<TotpEnrollResult> {
    const secret = this.totpService.generateSecret();
    return withRlsContext(this.db, { actingUserId: userId }, async (trx) => {
      await trx
        .insertInto('totp_secrets')
        .values({ user_id: userId, secret_encrypted: this.encryptionService.encrypt(secret) })
        .onConflict((oc) => oc.column('user_id').doUpdateSet({ secret_encrypted: this.encryptionService.encrypt(secret), confirmed_at: null }))
        .execute();
      return { otpauth_uri: this.totpService.otpauthUri(secret, userId) };
    });
  }

  /** Confirms a pending enrollment for an already-authenticated user. The
   * mid-login MFA-challenge variant (mfa_token in the request body) is
   * handled by `completeMfaLogin` instead — see the controller. */
  async totpConfirm(userId: string, code: string): Promise<void> {
    return withRlsContext(this.db, { actingUserId: userId }, async (trx) => {
      const row = await trx
        .selectFrom('totp_secrets')
        .select(['secret_encrypted'])
        .where('user_id', '=', userId)
        .executeTakeFirst();
      if (!row) throw ProblemException.badRequest('Önce TOTP kaydı başlatılmalı.');
      const secret = this.encryptionService.decrypt(row.secret_encrypted);
      if (!this.totpService.verify(secret, code)) {
        throw ProblemException.unauthorized('Kod geçersiz.');
      }
      await trx.updateTable('totp_secrets').set({ confirmed_at: new Date() }).where('user_id', '=', userId).execute();
    });
  }

  async completeMfaLogin(mfaToken: string, code: string, meta: RequestMeta): Promise<AuthResult> {
    const payload = this.tokenService.verifyAccessToken(mfaToken);
    if (!payload || payload.session_id !== 'mfa-pending') {
      throw ProblemException.unauthorized('mfa_token geçersiz veya süresi dolmuş.');
    }
    return withRlsContext(this.db, { actingUserId: payload.sub }, async (trx) => {
      const row = await trx
        .selectFrom('totp_secrets')
        .select(['secret_encrypted'])
        .where('user_id', '=', payload.sub)
        .executeTakeFirst();
      const user = await trx
        .selectFrom('users')
        .select(['status', 'roles'])
        .where('user_id', '=', payload.sub)
        .executeTakeFirstOrThrow();
      if (!row || !this.totpService.verify(this.encryptionService.decrypt(row.secret_encrypted), code)) {
        throw ProblemException.unauthorized('Kod geçersiz.');
      }
      const issued = await this.issueSession(trx, { userId: payload.sub, roles: user.roles, appContext: payload.app_context, meta });
      await writeAuditLog(trx, {
        eventType: 'auth.mfa_login_complete',
        eventCategory: 'auth',
        eventSeverity: 'info',
        userId: payload.sub,
        actingUserId: payload.sub,
        sessionId: issued.session_id,
      });
      return this.toAuthResult(issued, payload.sub, user.status, payload.app_context, meta.platform);
    });
  }

  async generateBackupCodes(userId: string): Promise<BackupCodesResult> {
    return withRlsContext(this.db, { actingUserId: userId }, async (trx) => {
      await trx.deleteFrom('backup_codes').where('user_id', '=', userId).execute();
      const codes = Array.from({ length: 10 }, () => randomToken(5));
      for (const code of codes) {
        await trx.insertInto('backup_codes').values({ user_id: userId, code_hash: sha256Hex(code) }).execute();
      }
      return { codes };
    });
  }

  // ── Refresh / logout / sessions ─────────────────────────────────────

  async refresh(refreshTokenRaw: string): Promise<TokenPair> {
    const tokenHash = sha256Hex(refreshTokenRaw);
    const found = await findRefreshTokenByHash(this.db, tokenHash);
    if (!found) {
      throw ProblemException.unauthorized('refresh_token geçersiz.');
    }
    if (found.revoked_at || found.used_at) {
      // Replay of an already-rotated/revoked token: revoke the whole chain
      // (Module 1 §3.5). Requires acting_user_id from the token's own claim
      // since the token is by definition no longer trustworthy for a fresh grant.
      await withRlsContext(this.db, { actingUserId: found.user_id }, async (trx) => {
        await trx
          .updateTable('sessions')
          .set({ revoked_at: new Date(), revoke_reason: 'refresh_token_replay' })
          .where('session_id', '=', found.session_id)
          .execute();
        await writeAuditLog(trx, {
          eventType: 'auth.refresh_replay_detected',
          eventCategory: 'security',
          eventSeverity: 'critical',
          userId: found.user_id,
          actingUserId: found.user_id,
          sessionId: found.session_id,
        });
      });
      throw ProblemException.unauthorized('refresh_token tekrar kullanıldı; oturum sonlandırıldı.');
    }

    return withRlsContext(this.db, { actingUserId: found.user_id }, async (trx) => {
      const session = await trx
        .selectFrom('sessions')
        .select(['session_id', 'app_context', 'revoked_at'])
        .where('session_id', '=', found.session_id)
        .executeTakeFirstOrThrow();
      if (session.revoked_at) {
        throw ProblemException.unauthorized('Oturum sonlandırılmış.');
      }
      const user = await trx
        .selectFrom('users')
        .select(['roles'])
        .where('user_id', '=', found.user_id)
        .executeTakeFirstOrThrow();

      const newRefreshRaw = randomToken();
      const newRefresh = await trx
        .insertInto('refresh_tokens')
        .values({ session_id: session.session_id, token_hash: sha256Hex(newRefreshRaw) })
        .returning(['refresh_token_id'])
        .executeTakeFirstOrThrow();
      await trx
        .updateTable('refresh_tokens')
        .set({ used_at: new Date(), rotated_to_token_id: newRefresh.refresh_token_id })
        .where('refresh_token_id', '=', found.refresh_token_id)
        .execute();

      const accessToken = this.tokenService.signAccessToken({
        sub: found.user_id,
        session_id: session.session_id,
        app_context: session.app_context,
        roles: user.roles,
      });

      return { access_token: accessToken, expires_in: this.tokenService.accessTokenTtlSeconds, refresh_token: newRefreshRaw };
    });
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    await withRlsContext(this.db, { actingUserId: userId }, async (trx) => {
      await trx
        .updateTable('sessions')
        .set({ revoked_at: new Date(), revoke_reason: 'logout' })
        .where('session_id', '=', sessionId)
        .where('user_id', '=', userId)
        .execute();
    });
  }

  async listSessions(userId: string, currentSessionId: string): Promise<SessionPublic[]> {
    return withRlsContext(this.db, { actingUserId: userId }, async (trx) => {
      const rows = await trx
        .selectFrom('sessions')
        .select(['session_id', 'app_context', 'platform', 'device_label', 'created_at'])
        .where('user_id', '=', userId)
        .where('revoked_at', 'is', null)
        .orderBy('created_at', 'desc')
        .execute();
      return rows.map((r) => ({
        session_id: r.session_id,
        app_context: r.app_context as SessionPublic['app_context'],
        platform: r.platform as SessionPublic['platform'],
        device_label: r.device_label,
        created_at: new Date(r.created_at).toISOString(),
        is_current: r.session_id === currentSessionId,
      }));
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await withRlsContext(this.db, { actingUserId: userId }, async (trx) => {
      const result = await trx
        .updateTable('sessions')
        .set({ revoked_at: new Date(), revoke_reason: 'user_revoked' })
        .where('session_id', '=', sessionId)
        .where('user_id', '=', userId)
        .where('revoked_at', 'is', null)
        .executeTakeFirst();
      if (result.numUpdatedRows === 0n) {
        throw ProblemException.notFound();
      }
    });
  }
}
