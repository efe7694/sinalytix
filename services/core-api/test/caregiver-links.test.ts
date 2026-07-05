import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import { withRlsContext } from '@sinalytix/db';
import type { Pool } from 'pg';
import Redis from 'ioredis';
import { CaregiverLinksService } from '../src/caregiver-links/caregiver-links.service';
import { RedeemRateLimiter } from '../src/common/redeem-rate-limiter.service';
import { createUser, setupTestDatabase, truncateAll } from './setup';

describe('CaregiverLinksService (Module 2 §3.4, Faz 1 Slice 4, LINK_01)', () => {
  let ownerPool: Pool;
  let ownerDb: Kysely<Database>;
  let appPool: Pool;
  let appDb: Kysely<Database>;
  let redis: Redis;
  let service: CaregiverLinksService;

  beforeAll(async () => {
    ({ ownerPool, ownerDb, appPool, appDb } = await setupTestDatabase());
    redis = new Redis(process.env.REDIS_URL as string);
    service = new CaregiverLinksService(appDb, new RedeemRateLimiter(redis));
  });

  beforeEach(async () => {
    await truncateAll(ownerDb);
    await redis.flushdb();
  });

  afterAll(async () => {
    await ownerPool.end();
    await appPool.end();
    redis.disconnect();
  });

  let seq = 0;
  function phone(): string {
    seq += 1;
    return `+1416559${String(seq).padStart(4, '0')}`;
  }
  async function makePatient() {
    const patient = await createUser(appDb, { phone_e164: phone(), roles: ['patient'], status: 'active' });
    await withRlsContext(appDb, { actingUserId: patient.user_id }, (trx) =>
      trx.insertInto('patient_profiles').values({ user_id: patient.user_id, first_name: 'Test', last_name: 'Patient' }).execute(),
    );
    return patient;
  }
  async function makeCaregiver() {
    return createUser(appDb, { phone_e164: phone(), roles: ['caregiver'], status: 'active' });
  }

  describe('generateCode() / revokeCode()', () => {
    it('generates an uppercase code + qr, expiring in the future', async () => {
      const patient = await makePatient();
      const res = await service.generateCode(patient.user_id, patient.user_id);
      expect(res.code).toMatch(/^[A-Z0-9]{6}$/);
      expect(res.qr_payload.length).toBeGreaterThan(10);
      expect(new Date(res.expires_at).getTime()).toBeGreaterThan(Date.now());
    });

    it('generating a new code expires the previous one (only one pending per patient)', async () => {
      const patient = await makePatient();
      const first = await service.generateCode(patient.user_id, patient.user_id);
      await service.generateCode(patient.user_id, patient.user_id);

      const caregiver = await makeCaregiver();
      await expect(service.redeem(caregiver.user_id, { code: first.code })).rejects.toMatchObject({ status: 404 });
    });

    it('revokeCode() 404s when there is no pending code', async () => {
      const patient = await makePatient();
      await expect(service.revokeCode(patient.user_id, patient.user_id)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('redeem()', () => {
    it('links the caregiver and returns the patient summary', async () => {
      const patient = await makePatient();
      const caregiver = await makeCaregiver();
      const code = await service.generateCode(patient.user_id, patient.user_id);

      const linked = await service.redeem(caregiver.user_id, { code: code.code });
      expect(linked.status).toBe('linked');
      expect(linked.patient_id).toBe(patient.user_id);
      expect(linked.first_name).toBe('Test');
      expect(linked.linked_at).not.toBeNull();
    });

    it('redeeming via qr_payload works the same', async () => {
      const patient = await makePatient();
      const caregiver = await makeCaregiver();
      const code = await service.generateCode(patient.user_id, patient.user_id);
      await expect(service.redeem(caregiver.user_id, { qr_payload: code.qr_payload })).resolves.toMatchObject({ status: 'linked' });
    });

    it('a lowercase code still resolves (server uppercases at lookup, legacy parity)', async () => {
      const patient = await makePatient();
      const caregiver = await makeCaregiver();
      const code = await service.generateCode(patient.user_id, patient.user_id);
      await expect(service.redeem(caregiver.user_id, { code: code.code.toLowerCase() })).resolves.toMatchObject({ status: 'linked' });
    });

    it('an invalid/guessed code returns a generic 404 (anti-enumeration)', async () => {
      const caregiver = await makeCaregiver();
      await expect(service.redeem(caregiver.user_id, { code: 'ZZZZZZ' })).rejects.toMatchObject({ status: 404 });
    });

    it('an already-redeemed code cannot be redeemed by a second caregiver', async () => {
      const patient = await makePatient();
      const cgA = await makeCaregiver();
      const cgB = await makeCaregiver();
      const code = await service.generateCode(patient.user_id, patient.user_id);
      await service.redeem(cgA.user_id, { code: code.code });
      await expect(service.redeem(cgB.user_id, { code: code.code })).rejects.toMatchObject({ status: 404 });
    });

    it('rejects re-linking a caregiver already linked to the same patient (409)', async () => {
      const patient = await makePatient();
      const caregiver = await makeCaregiver();
      const codeA = await service.generateCode(patient.user_id, patient.user_id);
      await service.redeem(caregiver.user_id, { code: codeA.code });
      const codeB = await service.generateCode(patient.user_id, patient.user_id);
      await expect(service.redeem(caregiver.user_id, { code: codeB.code })).rejects.toMatchObject({ status: 409 });
    });

    it('5 failed redeem attempts triggers a 429 lockout, then rejects even a valid code', async () => {
      const caregiver = await makeCaregiver();
      for (let i = 0; i < 4; i++) {
        await expect(service.redeem(caregiver.user_id, { code: 'ZZZZZZ' })).rejects.toMatchObject({ status: 404 });
      }
      await expect(service.redeem(caregiver.user_id, { code: 'ZZZZZZ' })).rejects.toMatchObject({ status: 429 });

      const patient = await makePatient();
      const code = await service.generateCode(patient.user_id, patient.user_id);
      await expect(service.redeem(caregiver.user_id, { code: code.code })).rejects.toMatchObject({ status: 429 });
    });

    it('caregiver-link redeem does NOT create a consent grant (no clinical access in Faz 1)', async () => {
      const patient = await makePatient();
      const caregiver = await makeCaregiver();
      const code = await service.generateCode(patient.user_id, patient.user_id);
      await service.redeem(caregiver.user_id, { code: code.code });

      const grants = await withRlsContext(appDb, { actingUserId: patient.user_id }, (trx) =>
        trx.selectFrom('consent_grants').selectAll().where('patient_id', '=', patient.user_id).execute(),
      );
      expect(grants).toHaveLength(0);
    });
  });

  describe('unlink()', () => {
    it('the patient can unlink (stamps unlinked_by=patient)', async () => {
      const patient = await makePatient();
      const caregiver = await makeCaregiver();
      const code = await service.generateCode(patient.user_id, patient.user_id);
      const link = await service.redeem(caregiver.user_id, { code: code.code });

      await service.unlink(link.link_id, patient.user_id);
      const row = await withRlsContext(appDb, { actingUserId: patient.user_id }, (trx) =>
        trx.selectFrom('caregiver_links').selectAll().where('link_id', '=', link.link_id).executeTakeFirst(),
      );
      expect(row?.status).toBe('unlinked');
      expect(row?.unlinked_by).toBe('patient');
    });

    it('the caregiver can unlink (stamps unlinked_by=caregiver)', async () => {
      const patient = await makePatient();
      const caregiver = await makeCaregiver();
      const code = await service.generateCode(patient.user_id, patient.user_id);
      const link = await service.redeem(caregiver.user_id, { code: code.code });

      await service.unlink(link.link_id, caregiver.user_id);
      const row = await withRlsContext(appDb, { actingUserId: patient.user_id }, (trx) =>
        trx.selectFrom('caregiver_links').selectAll().where('link_id', '=', link.link_id).executeTakeFirst(),
      );
      expect(row?.status).toBe('unlinked');
      expect(row?.unlinked_by).toBe('caregiver');
    });

    it('an unrelated third party cannot unlink (404)', async () => {
      const patient = await makePatient();
      const caregiver = await makeCaregiver();
      const stranger = await makeCaregiver();
      const code = await service.generateCode(patient.user_id, patient.user_id);
      const link = await service.redeem(caregiver.user_id, { code: code.code });

      await expect(service.unlink(link.link_id, stranger.user_id)).rejects.toMatchObject({ status: 404 });
      const row = await withRlsContext(appDb, { actingUserId: patient.user_id }, (trx) =>
        trx.selectFrom('caregiver_links').selectAll().where('link_id', '=', link.link_id).executeTakeFirst(),
      );
      expect(row?.status).toBe('linked'); // untouched
    });

    it('unlinking an already-unlinked link is a 404', async () => {
      const patient = await makePatient();
      const caregiver = await makeCaregiver();
      const code = await service.generateCode(patient.user_id, patient.user_id);
      const link = await service.redeem(caregiver.user_id, { code: code.code });
      await service.unlink(link.link_id, patient.user_id);
      await expect(service.unlink(link.link_id, patient.user_id)).rejects.toMatchObject({ status: 404 });
    });

    it('after unlink, the same caregiver can re-link with a fresh code', async () => {
      const patient = await makePatient();
      const caregiver = await makeCaregiver();
      const code1 = await service.generateCode(patient.user_id, patient.user_id);
      const link = await service.redeem(caregiver.user_id, { code: code1.code });
      await service.unlink(link.link_id, patient.user_id);

      const code2 = await service.generateCode(patient.user_id, patient.user_id);
      await expect(service.redeem(caregiver.user_id, { code: code2.code })).resolves.toMatchObject({ status: 'linked' });
    });
  });

  describe('listMyPatients() — RLS cross-tenant isolation', () => {
    it('a caregiver only sees their own linked patients, not another caregiver\'s', async () => {
      const patientA = await makePatient();
      const patientB = await makePatient();
      const cgA = await makeCaregiver();
      const cgB = await makeCaregiver();

      const codeA = await service.generateCode(patientA.user_id, patientA.user_id);
      await service.redeem(cgA.user_id, { code: codeA.code });
      const codeB = await service.generateCode(patientB.user_id, patientB.user_id);
      await service.redeem(cgB.user_id, { code: codeB.code });

      const forA = await service.listMyPatients(cgA.user_id);
      expect(forA).toHaveLength(1);
      expect(forA[0].patient_id).toBe(patientA.user_id);
      expect(forA[0].first_name).toBe('Test');

      const forB = await service.listMyPatients(cgB.user_id);
      expect(forB).toHaveLength(1);
      expect(forB[0].patient_id).toBe(patientB.user_id);
    });

    it('an unlinked patient drops off the roster', async () => {
      const patient = await makePatient();
      const caregiver = await makeCaregiver();
      const code = await service.generateCode(patient.user_id, patient.user_id);
      const link = await service.redeem(caregiver.user_id, { code: code.code });
      expect(await service.listMyPatients(caregiver.user_id)).toHaveLength(1);

      await service.unlink(link.link_id, caregiver.user_id);
      expect(await service.listMyPatients(caregiver.user_id)).toHaveLength(0);
    });
  });
});
