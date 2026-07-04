import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import { withRlsContext } from '@sinalytix/db';
import type { Pool } from 'pg';
import { authenticator } from 'otplib';
import Redis from 'ioredis';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/common/problem-details.filter';
import { createUser, setupTestDatabase, truncateAll } from './setup';

async function inject(app: NestFastifyApplication, opts: Parameters<ReturnType<NestFastifyApplication['getHttpAdapter']>['getInstance']['inject']>[0]) {
  return app.getHttpAdapter().getInstance().inject(opts as never);
}

describe('Faz 0 auth flows (Module 2 §3.1)', () => {
  let app: NestFastifyApplication;
  let ownerPool: Pool;
  let ownerDb: Kysely<Database>;
  let appPool: Pool;
  let appDb: Kysely<Database>;
  let redis: Redis;

  beforeAll(async () => {
    ({ ownerPool, ownerDb, appPool, appDb } = await setupTestDatabase());
    redis = new Redis(process.env.REDIS_URL as string);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalFilters(new ProblemDetailsFilter());
    app.setGlobalPrefix('v1');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  beforeEach(async () => {
    await truncateAll(ownerDb);
    await redis.flushdb();
  });

  afterAll(async () => {
    await app.close();
    await ownerPool.end();
    await appPool.end();
    redis.disconnect();
  });

  async function otpSignup(phone: string) {
    await inject(app, { method: 'POST', url: '/v1/auth/otp/request', payload: { phone_e164: phone } });
    const code = await redis.get(`otp:code:${createHash('sha256').update(phone).digest('hex')}`);
    const verify = await inject(app, {
      method: 'POST',
      url: '/v1/auth/otp/verify',
      payload: { phone_e164: phone, code, app_context: 'patient' },
    });
    return JSON.parse(verify.body);
  }

  it('signup via OTP creates an incomplete patient user + auto-created patient_profile, and GET /me reflects it', async () => {
    const auth = await otpSignup('+14165551000');
    expect(auth.status).toBe('incomplete');
    expect(auth.session.app_context).toBe('patient');
    expect(auth.access_token).toBeTruthy();

    const me = await inject(app, {
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${auth.access_token}`, 'x-app-context': 'patient' },
    });
    expect(me.statusCode).toBe(200);
    const body = JSON.parse(me.body);
    expect(body.user.phone_e164).toBe('+14165551000');
    expect(body.user.roles).toEqual(['patient']);
    expect(body.profile).not.toBeNull();
    expect(body.profile.timezone_iana).toBe('America/Toronto');
  });

  it('rejects a request whose X-App-Context does not match the session (Module 2 §1.3)', async () => {
    const auth = await otpSignup('+14165551001');
    const res = await inject(app, {
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${auth.access_token}`, 'x-app-context': 'family' },
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.type).toContain('/errors/');
    expect(body.trace_id).toBeTruthy();
  });

  it('refresh rotates the token; reusing the old refresh_token revokes the session (replay detection, Module 1 §3.5)', async () => {
    const auth = await otpSignup('+14165551002');

    const refreshed = await inject(app, { method: 'POST', url: '/v1/auth/refresh', payload: { refresh_token: auth.refresh_token } });
    expect(refreshed.statusCode).toBe(200);
    const newPair = JSON.parse(refreshed.body);
    expect(newPair.refresh_token).not.toBe(auth.refresh_token);

    // Replay the original (already-rotated) refresh token.
    const replay = await inject(app, { method: 'POST', url: '/v1/auth/refresh', payload: { refresh_token: auth.refresh_token } });
    expect(replay.statusCode).toBe(401);

    // The whole session should now be dead — even the *new* refresh token from
    // the legitimate rotation must no longer work (Module 1 §3.5: replay → chain revoke).
    const afterReplay = await inject(app, { method: 'POST', url: '/v1/auth/refresh', payload: { refresh_token: newPair.refresh_token } });
    expect(afterReplay.statusCode).toBe(401);
  });

  it('enforces max 5 concurrent sessions by evicting the oldest (Module 1 §3.5)', async () => {
    const user = await createUser(appDb, { phone_e164: '+14165551003', roles: ['patient'], status: 'active' });
    await withRlsContext(appDb, { actingUserId: user.user_id }, (trx) => trx.insertInto('patient_profiles').values({ user_id: user.user_id }).execute());

    const preexisting: string[] = [];
    for (let i = 0; i < 5; i++) {
      const s = await withRlsContext(appDb, { actingUserId: user.user_id }, (trx) =>
        trx
          .insertInto('sessions')
          .values({
            user_id: user.user_id,
            app_context: 'patient',
            platform: 'mobile_ios',
            max_at: new Date(Date.now() + 1000 * 60 * 60),
            idle_at: new Date(Date.now() + 1000 * 60 * 60),
            created_at: new Date(Date.now() - (5 - i) * 60_000), // oldest first
          })
          .returning(['session_id'])
          .executeTakeFirstOrThrow(),
      );
      preexisting.push(s.session_id);
    }

    // A 6th session via a real OTP verify for the same phone (existing-user path).
    await inject(app, { method: 'POST', url: '/v1/auth/otp/request', payload: { phone_e164: '+14165551003' } });
    const code = await redis.get(`otp:code:${createHash('sha256').update('+14165551003').digest('hex')}`);
    await inject(app, { method: 'POST', url: '/v1/auth/otp/verify', payload: { phone_e164: '+14165551003', code, app_context: 'patient' } });

    const active = await withRlsContext(appDb, { actingUserId: user.user_id }, (trx) =>
      trx.selectFrom('sessions').select(['session_id']).where('revoked_at', 'is', null).execute(),
    );
    expect(active).toHaveLength(5);
    expect(active.map((s) => s.session_id)).not.toContain(preexisting[0]); // oldest evicted
  });

  it('HCP email+password signup, TOTP enroll + confirm, then login requires mfa_token to complete', async () => {
    const signup = await inject(app, {
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { auth_method: 'email_password', app_context: 'hcp', email: 'dr.test@example.com', password: 'correct-horse-battery-staple' },
    });
    expect(signup.statusCode).toBe(201);
    const created = JSON.parse(signup.body);

    const enroll = await inject(app, {
      method: 'POST',
      url: '/v1/auth/mfa/totp/enroll',
      headers: { authorization: `Bearer ${created.access_token}`, 'x-app-context': 'hcp' },
    });
    const { otpauth_uri } = JSON.parse(enroll.body);
    const secret = new URL(otpauth_uri).searchParams.get('secret') as string;

    const confirm = await inject(app, {
      method: 'POST',
      url: '/v1/auth/mfa/totp/verify',
      headers: { authorization: `Bearer ${created.access_token}`, 'x-app-context': 'hcp' },
      payload: { code: authenticator.generate(secret) },
    });
    expect(confirm.statusCode).toBe(204);

    const login = await inject(app, {
      method: 'POST',
      url: '/v1/auth/login',
      payload: { auth_method: 'email_password', app_context: 'hcp', email: 'dr.test@example.com', password: 'correct-horse-battery-staple' },
    });
    const loginBody = JSON.parse(login.body);
    expect(loginBody.mfa_required).toBe(true);
    expect(loginBody.mfa_token).toBeTruthy();
    expect(loginBody.access_token).toBeUndefined();

    const complete = await inject(app, {
      method: 'POST',
      url: '/v1/auth/mfa/totp/complete',
      payload: { mfa_token: loginBody.mfa_token, code: authenticator.generate(secret) },
    });
    expect(complete.statusCode).toBe(200);
    const completed = JSON.parse(complete.body);
    expect(completed.access_token).toBeTruthy();
    expect(completed.session.app_context).toBe('hcp');
  });

  it('returns RFC 7807 problem+json on validation failure', async () => {
    const res = await inject(app, {
      method: 'POST',
      url: '/v1/auth/signup',
      payload: { auth_method: 'email_password', app_context: 'hcp' }, // missing email/password
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.type).toBeTruthy();
    expect(body.title).toBeTruthy();
    expect(body.status).toBe(400);
    expect(body.trace_id).toBeTruthy();
  });
});
