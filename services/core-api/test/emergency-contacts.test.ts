import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import type { Pool } from 'pg';
import Redis from 'ioredis';
import { EmergencyContactsService } from '../src/emergency-contacts/emergency-contacts.service';
import { createUser, setupTestDatabase, truncateAll } from './setup';

describe('EmergencyContactsService (Module 2 §3.3, Faz 1 Slice 2)', () => {
  let ownerPool: Pool;
  let ownerDb: Kysely<Database>;
  let appPool: Pool;
  let appDb: Kysely<Database>;
  let redis: Redis;
  let service: EmergencyContactsService;

  beforeAll(async () => {
    ({ ownerPool, ownerDb, appPool, appDb } = await setupTestDatabase());
    redis = new Redis(process.env.REDIS_URL as string);
    service = new EmergencyContactsService(appDb, redis);
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
    return `+1416557${String(seq).padStart(4, '0')}`;
  }
  async function makePatient() {
    return createUser(appDb, { phone_e164: phone(), roles: ['patient'], status: 'active' });
  }

  const baseInput = { relationship: 'spouse', first_name: 'Ayşe', last_name: 'Yılmaz', phone: '+14165550001' };

  describe('create()', () => {
    it('auto-assigns sort_order starting at 1, appending for each new contact', async () => {
      const patient = await makePatient();
      const first = await service.create(patient.user_id, patient.user_id, baseInput);
      const second = await service.create(patient.user_id, patient.user_id, { ...baseInput, phone: '+14165550002' });
      expect(first.sort_order).toBe(1);
      expect(second.sort_order).toBe(2);
    });

    it('rejects a 4th contact (max 3, C20/C21)', async () => {
      const patient = await makePatient();
      await service.create(patient.user_id, patient.user_id, { ...baseInput, phone: '+14165550001' });
      await service.create(patient.user_id, patient.user_id, { ...baseInput, phone: '+14165550002' });
      await service.create(patient.user_id, patient.user_id, { ...baseInput, phone: '+14165550003' });

      await expect(
        service.create(patient.user_id, patient.user_id, { ...baseInput, phone: '+14165550004' }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('rejects a duplicate phone for the same patient (409)', async () => {
      const patient = await makePatient();
      await service.create(patient.user_id, patient.user_id, baseInput);
      await expect(service.create(patient.user_id, patient.user_id, baseInput)).rejects.toMatchObject({ status: 409 });
    });

    it('allows the same phone number across two different patients', async () => {
      const patientA = await makePatient();
      const patientB = await makePatient();
      await service.create(patientA.user_id, patientA.user_id, baseInput);
      await expect(service.create(patientB.user_id, patientB.user_id, baseInput)).resolves.toBeTruthy();
    });

    it('new contacts start unverified with pending invite status', async () => {
      const patient = await makePatient();
      const ec = await service.create(patient.user_id, patient.user_id, baseInput);
      expect(ec.phone_verified).toBe(false);
      expect(ec.invite_status).toBe('pending');
      expect(ec.linked_family_user_id).toBeNull();
    });
  });

  describe('list() — RLS cross-tenant isolation', () => {
    it('patient A cannot see patient B\'s emergency contacts', async () => {
      const patientA = await makePatient();
      const patientB = await makePatient();
      await service.create(patientA.user_id, patientA.user_id, baseInput);
      await service.create(patientB.user_id, patientB.user_id, { ...baseInput, phone: '+14165550009' });

      const asPatientA = await service.list(patientB.user_id, patientA.user_id);
      expect(asPatientA).toHaveLength(0);
    });

    it('returns contacts ordered by sort_order', async () => {
      const patient = await makePatient();
      await service.create(patient.user_id, patient.user_id, { ...baseInput, phone: '+14165550001' });
      await service.create(patient.user_id, patient.user_id, { ...baseInput, phone: '+14165550002' });

      const list = await service.list(patient.user_id, patient.user_id);
      expect(list.map((ec) => ec.sort_order)).toEqual([1, 2]);
    });
  });

  describe('update()', () => {
    it('resets phone_verified to false when phone changes', async () => {
      const patient = await makePatient();
      const ec = await service.create(patient.user_id, patient.user_id, baseInput);
      await service.confirmPhoneVerification(ec.ec_id, patient.user_id, await seedCode(redis, ec.ec_id));

      const updated = await service.update(ec.ec_id, patient.user_id, { phone: '+14165559999' });
      expect(updated.phone_verified).toBe(false);
      expect(updated.phone).toBe('+14165559999');
    });

    it('merge-patch: omitted fields are left unchanged', async () => {
      const patient = await makePatient();
      const ec = await service.create(patient.user_id, patient.user_id, baseInput);
      const updated = await service.update(ec.ec_id, patient.user_id, { relationship: 'parent' });
      expect(updated.relationship).toBe('parent');
      expect(updated.first_name).toBe(baseInput.first_name);
      expect(updated.phone).toBe(baseInput.phone);
    });

    it('a stranger updating a contact they cannot see gets 404', async () => {
      const patient = await makePatient();
      const stranger = await makePatient();
      const ec = await service.create(patient.user_id, patient.user_id, baseInput);
      await expect(service.update(ec.ec_id, stranger.user_id, { relationship: 'parent' })).rejects.toMatchObject({ status: 404 });
    });

    it('rejects changing phone to one already used by another active contact (409, matches create())', async () => {
      const patient = await makePatient();
      const first = await service.create(patient.user_id, patient.user_id, { ...baseInput, phone: '+14165550001' });
      const second = await service.create(patient.user_id, patient.user_id, { ...baseInput, phone: '+14165550002' });
      await expect(service.update(second.ec_id, patient.user_id, { phone: first.phone })).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('remove()', () => {
    it('soft-deletes: excluded from list, and the freed phone/slot can be reused', async () => {
      const patient = await makePatient();
      const ec = await service.create(patient.user_id, patient.user_id, baseInput);
      await service.remove(ec.ec_id, patient.user_id);

      const list = await service.list(patient.user_id, patient.user_id);
      expect(list).toHaveLength(0);

      // Same phone, would 409 as a duplicate if the soft-deleted row still
      // counted — proves the partial unique index (WHERE deleted_at IS NULL)
      // and the count-based sort_order assignment both correctly ignore it.
      const recreated = await service.create(patient.user_id, patient.user_id, baseInput);
      expect(recreated.sort_order).toBe(1);
    });

    it('removing an already-removed contact is a 404', async () => {
      const patient = await makePatient();
      const ec = await service.create(patient.user_id, patient.user_id, baseInput);
      await service.remove(ec.ec_id, patient.user_id);
      await expect(service.remove(ec.ec_id, patient.user_id)).rejects.toMatchObject({ status: 404 });
    });

    it('removing a non-last contact frees exactly its own slot, not the highest one (regression: create() must not assume count+1)', async () => {
      const patient = await makePatient();
      const first = await service.create(patient.user_id, patient.user_id, { ...baseInput, phone: '+14165550001' });
      const second = await service.create(patient.user_id, patient.user_id, { ...baseInput, phone: '+14165550002' });
      expect(first.sort_order).toBe(1);
      expect(second.sort_order).toBe(2);

      await service.remove(first.ec_id, patient.user_id); // frees slot 1; slot 2 (second) stays active

      const third = await service.create(patient.user_id, patient.user_id, { ...baseInput, phone: '+14165550003' });
      expect(third.sort_order).toBe(1); // must reuse the freed slot 1, not collide on 2 via a naive count+1
    });
  });

  describe('reorder()', () => {
    it('swaps two contacts\' sort_order in one atomic call', async () => {
      const patient = await makePatient();
      const first = await service.create(patient.user_id, patient.user_id, { ...baseInput, phone: '+14165550001' });
      const second = await service.create(patient.user_id, patient.user_id, { ...baseInput, phone: '+14165550002' });

      const reordered = await service.reorder(patient.user_id, patient.user_id, [second.ec_id, first.ec_id]);
      const bySortOrder = [...reordered].sort((a, b) => a.sort_order - b.sort_order);
      expect(bySortOrder[0]?.ec_id).toBe(second.ec_id);
      expect(bySortOrder[1]?.ec_id).toBe(first.ec_id);
    });

    it('rejects a reorder list that doesn\'t exactly match the patient\'s current contacts', async () => {
      const patient = await makePatient();
      const first = await service.create(patient.user_id, patient.user_id, baseInput);
      await expect(
        service.reorder(patient.user_id, patient.user_id, [first.ec_id, '00000000-0000-0000-0000-000000000000']),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('rejects a duplicate id instead of silently leaving another owned contact untouched (regression)', async () => {
      const patient = await makePatient();
      const first = await service.create(patient.user_id, patient.user_id, { ...baseInput, phone: '+14165550001' });
      const second = await service.create(patient.user_id, patient.user_id, { ...baseInput, phone: '+14165550002' });
      await expect(
        service.reorder(patient.user_id, patient.user_id, [first.ec_id, first.ec_id]),
      ).rejects.toMatchObject({ status: 400 });

      // Confirms it's rejected outright, not silently applied — second's slot is untouched.
      const list = await service.list(patient.user_id, patient.user_id);
      expect(list.find((ec) => ec.ec_id === second.ec_id)?.sort_order).toBe(2);
    });
  });

  describe('phone verification', () => {
    it('happy path: request then confirm with the right code marks phone_verified', async () => {
      const patient = await makePatient();
      const ec = await service.create(patient.user_id, patient.user_id, baseInput);
      const code = await seedCode(redis, ec.ec_id);

      const confirmed = await service.confirmPhoneVerification(ec.ec_id, patient.user_id, code);
      expect(confirmed.phone_verified).toBe(true);
    });

    it('wrong code is rejected without marking verified', async () => {
      const patient = await makePatient();
      const ec = await service.create(patient.user_id, patient.user_id, baseInput);
      await seedCode(redis, ec.ec_id, '111111');

      await expect(service.confirmPhoneVerification(ec.ec_id, patient.user_id, '222222')).rejects.toMatchObject({ status: 400 });
    });

    it('5 failed attempts triggers a 429 lockout (Module 2 §3.3 rate-limit pattern)', async () => {
      const patient = await makePatient();
      const ec = await service.create(patient.user_id, patient.user_id, baseInput);
      await seedCode(redis, ec.ec_id, '111111');

      for (let i = 0; i < 4; i++) {
        await expect(service.confirmPhoneVerification(ec.ec_id, patient.user_id, '000000')).rejects.toMatchObject({ status: 400 });
      }
      // 5th failure crosses the threshold and locks out.
      await expect(service.confirmPhoneVerification(ec.ec_id, patient.user_id, '000000')).rejects.toMatchObject({ status: 429 });
      // Even the CORRECT code is now rejected until the lockout window passes.
      await expect(service.confirmPhoneVerification(ec.ec_id, patient.user_id, '111111')).rejects.toMatchObject({ status: 429 });
    });

    it('requesting a code more than 5 times in the window is rate-limited (429)', async () => {
      const patient = await makePatient();
      const ec = await service.create(patient.user_id, patient.user_id, baseInput);

      for (let i = 0; i < 5; i++) {
        await service.requestPhoneVerification(ec.ec_id, patient.user_id);
      }
      await expect(service.requestPhoneVerification(ec.ec_id, patient.user_id)).rejects.toMatchObject({ status: 429 });
    });

    it('a stranger confirming a contact they cannot see gets 404, before any Redis fail-count is touched (regression)', async () => {
      const patient = await makePatient();
      const stranger = await makePatient();
      const ec = await service.create(patient.user_id, patient.user_id, baseInput);
      await seedCode(redis, ec.ec_id, '111111');

      await expect(service.confirmPhoneVerification(ec.ec_id, stranger.user_id, '000000')).rejects.toMatchObject({ status: 404 });

      // The owner's own correct code still works — a non-owner's guess must
      // not have polluted this ec_id's fail-count/lockout bucket.
      const confirmed = await service.confirmPhoneVerification(ec.ec_id, patient.user_id, '111111');
      expect(confirmed.phone_verified).toBe(true);
    });
  });
});

/** Test helper: bypasses the SMS-send step (no provider wired) by writing
 * the code directly to the same Redis key requestPhoneVerification would
 * use, mirroring how auth-flow.test.ts reads otp:code:* after a real
 * request rather than intercepting console.log. */
async function seedCode(redis: Redis, ecId: string, code = '654321'): Promise<string> {
  await redis.set(`ec-verify:code:${ecId}`, code, 'EX', 300);
  return code;
}
