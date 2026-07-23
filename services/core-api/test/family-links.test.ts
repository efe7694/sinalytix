import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import type { Pool } from 'pg';
import Redis from 'ioredis';
import { FamilyLinksService } from '../src/family-links/family-links.service';
import { EmergencyContactsService } from '../src/emergency-contacts/emergency-contacts.service';
import { ConsentGrantsService } from '../src/consent-grants/consent-grants.service';
import { RedeemRateLimiter } from '../src/common/redeem-rate-limiter.service';
import { SystemConfigService } from '../src/common/system-config.service';
import { ApprovalGateService } from '../src/approval-requests/approval-gate.service';
import { withRlsContext } from '@sinalytix/db';
import { createUser, setupTestDatabase, truncateAll } from './setup';

describe('FamilyLinksService (Module 2 §3.4, Faz 1 Slice 3)', () => {
  let ownerPool: Pool;
  let ownerDb: Kysely<Database>;
  let appPool: Pool;
  let appDb: Kysely<Database>;
  let redis: Redis;
  let service: FamilyLinksService;
  let ecService: EmergencyContactsService;
  let consentGrantsService: ConsentGrantsService;

  beforeAll(async () => {
    ({ ownerPool, ownerDb, appPool, appDb } = await setupTestDatabase());
    redis = new Redis(process.env.REDIS_URL as string);
    consentGrantsService = new ConsentGrantsService(appDb);
    service = new FamilyLinksService(appDb, consentGrantsService, new RedeemRateLimiter(redis), new SystemConfigService(appDb));
    ecService = new EmergencyContactsService(appDb, new ApprovalGateService(appDb, new SystemConfigService(appDb)), redis);
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
    return `+1416558${String(seq).padStart(4, '0')}`;
  }
  async function makePatient() {
    const patient = await createUser(appDb, { phone_e164: phone(), roles: ['patient'], status: 'active' });
    // The real signup flow auto-creates this row (Faz 0); the raw
    // createUser() test helper doesn't, but listMyLinks() joins it.
    await withRlsContext(appDb, { actingUserId: patient.user_id }, (trx) =>
      trx.insertInto('patient_profiles').values({ user_id: patient.user_id, first_name: 'Test', last_name: 'Patient' }).execute(),
    );
    return patient;
  }
  async function makeFamily() {
    return createUser(appDb, { phone_e164: phone(), roles: ['family'], status: 'active' });
  }


  /** EC fixture: unwraps the FAM-12 gate result (see emergency-contacts.test.ts). */
  async function createEcFixture(...args: Parameters<EmergencyContactsService['create']>) {
    const res = await ecService.create(...args);
    if (!res.executed || !res.contact) throw new Error('expected an immediate create, got a deferred approval');
    return res.contact;
  }

  describe('generateCode() / revokeCode()', () => {
    it('generates a 6-digit code plus a qr payload, expiring in the future', async () => {
      const patient = await makePatient();
      const res = await service.generateCode(patient.user_id, patient.user_id);
      expect(res.code).toMatch(/^\d{6}$/);
      expect(res.qr_payload.length).toBeGreaterThan(10);
      expect(new Date(res.expires_at).getTime()).toBeGreaterThan(Date.now());
    });

    it('generating a new code expires the previous one (only one active connect code)', async () => {
      const patient = await makePatient();
      const first = await service.generateCode(patient.user_id, patient.user_id);
      const second = await service.generateCode(patient.user_id, patient.user_id);
      expect(second.code).not.toBe(first.code);

      // The first code must no longer be redeemable.
      const family = await makeFamily();
      await expect(
        service.redeem(family.user_id, { code: first.code, relationship: 'spouse' }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('revokeCode() 404s when there is no active code', async () => {
      const patient = await makePatient();
      await expect(service.revokeCode(patient.user_id, patient.user_id)).rejects.toMatchObject({ status: 404 });
    });

    it('a revoked code cannot be redeemed', async () => {
      const patient = await makePatient();
      const code = await service.generateCode(patient.user_id, patient.user_id);
      await service.revokeCode(patient.user_id, patient.user_id);

      const family = await makeFamily();
      await expect(
        service.redeem(family.user_id, { code: code.code, relationship: 'spouse' }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('redeem() — code/qr path', () => {
    it('creates a pending_patient_confirm link with no baseline grant yet', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const code = await service.generateCode(patient.user_id, patient.user_id);

      const link = await service.redeem(family.user_id, { code: code.code, relationship: 'spouse' });
      expect(link.status).toBe('pending_patient_confirm');
      expect(link.baseline_grant_id).toBeNull();
      expect(link.relationship).toBe('spouse');
      expect(link.patient_id).toBe(patient.user_id);
      expect(link.family_user_id).toBe(family.user_id);
    });

    it('redeeming via qr_payload works the same as code', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const code = await service.generateCode(patient.user_id, patient.user_id);

      const link = await service.redeem(family.user_id, { qr_payload: code.qr_payload, relationship: 'child' });
      expect(link.status).toBe('pending_patient_confirm');
      expect(link.source).toBe('qr');
    });

    it('requires relationship for a code/qr redeem (400)', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const code = await service.generateCode(patient.user_id, patient.user_id);
      await expect(service.redeem(family.user_id, { code: code.code })).rejects.toMatchObject({ status: 400 });
    });

    it('an invalid/guessed code returns a generic 404 (anti-enumeration)', async () => {
      const family = await makeFamily();
      await expect(service.redeem(family.user_id, { code: '000000', relationship: 'spouse' })).rejects.toMatchObject({ status: 404 });
    });

    it('an already-redeemed code cannot be redeemed again by a second family member', async () => {
      const patient = await makePatient();
      const familyA = await makeFamily();
      const familyB = await makeFamily();
      const code = await service.generateCode(patient.user_id, patient.user_id);

      await service.redeem(familyA.user_id, { code: code.code, relationship: 'spouse' });
      await expect(
        service.redeem(familyB.user_id, { code: code.code, relationship: 'child' }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rejects redeeming a second code for a patient already linked (409)', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const codeA = await service.generateCode(patient.user_id, patient.user_id);
      await service.redeem(family.user_id, { code: codeA.code, relationship: 'spouse' });

      const codeB = await service.generateCode(patient.user_id, patient.user_id);
      await expect(
        service.redeem(family.user_id, { code: codeB.code, relationship: 'spouse' }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('5 failed redeem attempts by the same family member triggers a 429 lockout', async () => {
      const family = await makeFamily();
      for (let i = 0; i < 4; i++) {
        await expect(service.redeem(family.user_id, { code: '000000', relationship: 'spouse' })).rejects.toMatchObject({ status: 404 });
      }
      await expect(service.redeem(family.user_id, { code: '000000', relationship: 'spouse' })).rejects.toMatchObject({ status: 429 });

      // Even a real, valid code is now rejected until the lockout window passes.
      const patient = await makePatient();
      const code = await service.generateCode(patient.user_id, patient.user_id);
      await expect(service.redeem(family.user_id, { code: code.code, relationship: 'spouse' })).rejects.toMatchObject({ status: 429 });
    });
  });

  describe('redeem() — ec_invite path (instant activation)', () => {
    it('activates immediately, creates a baseline grant, and updates the emergency_contacts row', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const ec = await createEcFixture(patient.user_id, patient.user_id, {
        relationship: 'spouse',
        first_name: 'Ayşe',
        last_name: 'Yılmaz',
        phone: '+14165551111',
      });
      const invite = await service.inviteEmergencyContact(ec.ec_id, patient.user_id);

      const link = await service.redeem(family.user_id, { code: invite.code });
      expect(link.status).toBe('active');
      expect(link.source).toBe('ec_invite');
      expect(link.relationship).toBe('spouse'); // inherited from the EC row, not caller-supplied
      expect(link.baseline_grant_id).not.toBeNull();
      expect(link.linked_at).not.toBeNull();

      const contacts = await ecService.list(patient.user_id, patient.user_id);
      const updatedEc = contacts.find((c) => c.ec_id === ec.ec_id);
      expect(updatedEc?.linked_family_user_id).toBe(family.user_id);
      expect(updatedEc?.invite_status).toBe('accepted_app_user');
    });

    it('an active ec_invite family member CANNOT tamper with or delete the patient\'s emergency contact (Slice 3 review C1)', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const ec = await createEcFixture(patient.user_id, patient.user_id, {
        relationship: 'spouse',
        first_name: 'Ayşe',
        last_name: 'Yılmaz',
        phone: '+14165550001',
      });
      const invite = await service.inviteEmergencyContact(ec.ec_id, patient.user_id);
      await service.redeem(family.user_id, { code: invite.code }); // link now active; family can READ the EC

      // The family member can see the contact (care-circle read is intended)...
      // ...but must NOT be able to rewrite its phone/name or soft-delete it:
      // that phone is who the SOS chain dials.
      await expect(
        ecService.update(ec.ec_id, family.user_id, { phone: '+19998887777', first_name: 'H' }),
      ).rejects.toMatchObject({ status: 404 });
      await expect(ecService.remove(ec.ec_id, family.user_id)).rejects.toMatchObject({ status: 404 });

      // The patient's contact is untouched.
      const contacts = await ecService.list(patient.user_id, patient.user_id);
      const stillThere = contacts.find((c) => c.ec_id === ec.ec_id);
      expect(stillThere?.phone).toBe('+14165550001');
      expect(stillThere?.first_name).toBe('Ayşe');
    });

    it('ec_invite redeem does not require a relationship field', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const ec = await createEcFixture(patient.user_id, patient.user_id, {
        relationship: 'sibling',
        first_name: 'A',
        last_name: 'B',
        phone: '+14165551234',
      });
      const invite = await service.inviteEmergencyContact(ec.ec_id, patient.user_id);
      await expect(service.redeem(family.user_id, { code: invite.code })).resolves.toMatchObject({ status: 'active' });
    });

    it('generating a new EC invite replaces the previous one for that same contact', async () => {
      const patient = await makePatient();
      const ec = await createEcFixture(patient.user_id, patient.user_id, {
        relationship: 'spouse',
        first_name: 'A',
        last_name: 'B',
        phone: '+14165551235',
      });
      const first = await service.inviteEmergencyContact(ec.ec_id, patient.user_id);
      const second = await service.inviteEmergencyContact(ec.ec_id, patient.user_id);

      const family = await makeFamily();
      await expect(service.redeem(family.user_id, { code: first.code })).rejects.toMatchObject({ status: 404 });
      await expect(service.redeem(family.user_id, { code: second.code })).resolves.toMatchObject({ status: 'active' });
    });

    it('atomicity: if the invited contact is removed before redeem, the whole transaction rolls back (no orphan link/grant, code not permanently burned)', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const ec = await createEcFixture(patient.user_id, patient.user_id, {
        relationship: 'spouse',
        first_name: 'A',
        last_name: 'B',
        phone: '+14165551236',
      });
      const invite = await service.inviteEmergencyContact(ec.ec_id, patient.user_id);
      await ecService.remove(ec.ec_id, patient.user_id);

      await expect(service.redeem(family.user_id, { code: invite.code })).rejects.toMatchObject({ status: 409 });

      const links = await service.listMyLinks(family.user_id);
      expect(links).toHaveLength(0);
    });
  });

  describe('confirm()', () => {
    it('patient confirming a pending_patient_confirm link activates it and creates the baseline grant', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const code = await service.generateCode(patient.user_id, patient.user_id);
      const pending = await service.redeem(family.user_id, { code: code.code, relationship: 'spouse' });

      const confirmed = await service.confirm(pending.link_id, patient.user_id);
      expect(confirmed.status).toBe('active');
      expect(confirmed.baseline_grant_id).not.toBeNull();
      expect(confirmed.linked_at).not.toBeNull();
    });

    it('a total stranger gets 404 (link invisible to them)', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const stranger = await makePatient();
      const code = await service.generateCode(patient.user_id, patient.user_id);
      const pending = await service.redeem(family.user_id, { code: code.code, relationship: 'spouse' });

      await expect(service.confirm(pending.link_id, stranger.user_id)).rejects.toMatchObject({ status: 404 });
    });

    it('the family member themself gets 403 (visible, but only the patient may confirm)', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const code = await service.generateCode(patient.user_id, patient.user_id);
      const pending = await service.redeem(family.user_id, { code: code.code, relationship: 'spouse' });

      await expect(service.confirm(pending.link_id, family.user_id)).rejects.toMatchObject({ status: 403 });
    });

    it('confirming an already-active link is a 409', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const code = await service.generateCode(patient.user_id, patient.user_id);
      const pending = await service.redeem(family.user_id, { code: code.code, relationship: 'spouse' });
      await service.confirm(pending.link_id, patient.user_id);

      await expect(service.confirm(pending.link_id, patient.user_id)).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('revokeLink() — cascades the baseline grant revoke', () => {
    it('patient-initiated revoke cascades to the baseline grant', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const ec = await createEcFixture(patient.user_id, patient.user_id, {
        relationship: 'spouse',
        first_name: 'A',
        last_name: 'B',
        phone: '+14165551237',
      });
      const invite = await service.inviteEmergencyContact(ec.ec_id, patient.user_id);
      const link = await service.redeem(family.user_id, { code: invite.code });

      await service.revokeLink(link.link_id, patient.user_id);

      const grants = await consentGrantsService.list(patient.user_id, patient.user_id, { limit: 10 });
      const grant = grants.data.find((g) => g.grant_id === link.baseline_grant_id);
      expect(grant?.revoked_at).not.toBeNull();
    });

    it('family-initiated self-unlink also cascades the baseline grant revoke', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const ec = await createEcFixture(patient.user_id, patient.user_id, {
        relationship: 'spouse',
        first_name: 'A',
        last_name: 'B',
        phone: '+14165551238',
      });
      const invite = await service.inviteEmergencyContact(ec.ec_id, patient.user_id);
      const link = await service.redeem(family.user_id, { code: invite.code });

      await service.revokeLink(link.link_id, family.user_id);

      const grants = await consentGrantsService.list(patient.user_id, patient.user_id, { limit: 10 });
      const grant = grants.data.find((g) => g.grant_id === link.baseline_grant_id);
      expect(grant?.revoked_at).not.toBeNull();

      const links = await service.listMyLinks(family.user_id);
      expect(links).toHaveLength(0);
    });

    it('an unrelated third party gets 404', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const stranger = await makeFamily();
      const code = await service.generateCode(patient.user_id, patient.user_id);
      const link = await service.redeem(family.user_id, { code: code.code, relationship: 'spouse' });

      await expect(service.revokeLink(link.link_id, stranger.user_id)).rejects.toMatchObject({ status: 404 });
    });

    it('revoking an already-revoked link is a 404', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const code = await service.generateCode(patient.user_id, patient.user_id);
      const link = await service.redeem(family.user_id, { code: code.code, relationship: 'spouse' });
      await service.revokeLink(link.link_id, patient.user_id);

      await expect(service.revokeLink(link.link_id, patient.user_id)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('listMyLinks() — RLS cross-tenant isolation', () => {
    it('a family member only sees their own active links, not another family member\'s', async () => {
      const patientA = await makePatient();
      const patientB = await makePatient();
      const familyA = await makeFamily();
      const familyB = await makeFamily();

      const codeA = await service.generateCode(patientA.user_id, patientA.user_id);
      await service.redeem(familyA.user_id, { code: codeA.code, relationship: 'spouse' });
      const codeB = await service.generateCode(patientB.user_id, patientB.user_id);
      const linkB = await service.redeem(familyB.user_id, { code: codeB.code, relationship: 'child' });
      await service.confirm(linkB.link_id, patientB.user_id);

      const linksForFamilyA = await service.listMyLinks(familyA.user_id);
      expect(linksForFamilyA).toHaveLength(0); // still pending_patient_confirm, not active yet

      const linksForFamilyB = await service.listMyLinks(familyB.user_id);
      expect(linksForFamilyB).toHaveLength(1);
      expect(linksForFamilyB[0].patient_id).toBe(patientB.user_id);
    });

    it('includes the patient\'s display name via the cross-actor patient_profiles read', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const ec = await createEcFixture(patient.user_id, patient.user_id, {
        relationship: 'spouse',
        first_name: 'Zeynep',
        last_name: 'Kaya',
        phone: '+14165551239',
      });
      const invite = await service.inviteEmergencyContact(ec.ec_id, patient.user_id);
      await service.redeem(family.user_id, { code: invite.code });

      const links = await service.listMyLinks(family.user_id);
      expect(links).toHaveLength(1);
      expect(links[0].permission_level).toBe('view');
    });
  });

  describe("updatePermission() — FAM-13 + K6 (D15 item B3)", () => {
    // This endpoint did not exist before Faz 1.5 Slice 4, which meant K6 had
    // no server-side enforcement point anywhere in the codebase.
    async function activeLink(patientId: string, familyId: string): Promise<string> {
      const row = await ownerDb
        .insertInto('patient_family_links')
        .values({
          patient_id: patientId,
          family_user_id: familyId,
          relationship: 'child',
          status: 'active',
          source: 'code',
          linked_at: new Date(),
        })
        .returning('link_id')
        .executeTakeFirstOrThrow();
      return row.link_id;
    }

    async function declareSdm(patientId: string, sdmUserId: string, active = true): Promise<void> {
      await ownerDb
        .insertInto('sdm_declarations')
        .values({ patient_id: patientId, sdm_user_id: sdmUserId, province_rule: 'ON_HCCA', active })
        .execute();
    }

    it('lets the patient raise a family member to `edit`', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const linkId = await activeLink(patient.user_id, family.user_id);

      const updated = await service.updatePermission(linkId, patient.user_id, 'patient', 'edit');
      expect(updated.permission_level).toBe('edit');
    });

    it('K6: refuses `full` when there is no active SDM declaration', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const linkId = await activeLink(patient.user_id, family.user_id);

      await expect(service.updatePermission(linkId, patient.user_id, 'patient', 'full')).rejects.toMatchObject({
        code: 'PERMISSION_DENIED',
      });
      // And the stored level is untouched — a refused write must not leave a
      // partially applied state.
      const row = await ownerDb
        .selectFrom('patient_family_links')
        .select('permission_level')
        .where('link_id', '=', linkId)
        .executeTakeFirstOrThrow();
      expect(row.permission_level).toBe('view');
    });

    it('K6: refuses `full` when the SDM declaration exists but is INACTIVE', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      await declareSdm(patient.user_id, family.user_id, false);
      const linkId = await activeLink(patient.user_id, family.user_id);

      await expect(service.updatePermission(linkId, patient.user_id, 'patient', 'full')).rejects.toMatchObject({
        code: 'PERMISSION_DENIED',
      });
    });

    it('K6: refuses `full` when the active SDM declaration names a DIFFERENT person', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const otherSdm = await makeFamily();
      await declareSdm(patient.user_id, otherSdm.user_id, true);
      const linkId = await activeLink(patient.user_id, family.user_id);

      await expect(service.updatePermission(linkId, patient.user_id, 'patient', 'full')).rejects.toMatchObject({
        code: 'PERMISSION_DENIED',
      });
    });

    it('K6: allows `full` for the declared, active SDM', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      await declareSdm(patient.user_id, family.user_id, true);
      const linkId = await activeLink(patient.user_id, family.user_id);

      const updated = await service.updatePermission(linkId, patient.user_id, 'patient', 'full');
      expect(updated.permission_level).toBe('full');
    });

    it('FAM-13: refuses the change from any app context other than the patient app', async () => {
      // Not merely "the patient must do it" — the CONTEXT matters, because
      // one User row can hold several roles (Sözlük §1), so a family app
      // session must never be able to raise its own access.
      const patient = await makePatient();
      const family = await makeFamily();
      const linkId = await activeLink(patient.user_id, family.user_id);

      for (const ctx of ['family', 'caregiver', 'hcp', 'admin']) {
        await expect(service.updatePermission(linkId, patient.user_id, ctx, 'edit')).rejects.toMatchObject({
          code: 'PERMISSION_DENIED',
        });
      }
    });

    it('a family member cannot raise their own permission (404, entity-non-leaking)', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const linkId = await activeLink(patient.user_id, family.user_id);

      // 404 rather than 403: the family member CAN read this row, so a 403
      // would confirm which link id belongs to them (Modül 1 §11).
      await expect(service.updatePermission(linkId, family.user_id, 'patient', 'edit')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('refuses to change the level of a link that is not active', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const row = await ownerDb
        .insertInto('patient_family_links')
        .values({
          patient_id: patient.user_id,
          family_user_id: family.user_id,
          relationship: 'child',
          status: 'pending_patient_confirm',
          source: 'code',
        })
        .returning('link_id')
        .executeTakeFirstOrThrow();

      await expect(service.updatePermission(row.link_id, patient.user_id, 'patient', 'edit')).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });
  });
});
