import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import { withRlsContext } from '@sinalytix/db';
import type { Pool } from 'pg';
import Redis from 'ioredis';
import { ApprovalRequestsService } from '../src/approval-requests/approval-requests.service';
import { ApprovalGateService } from '../src/approval-requests/approval-gate.service';
import { CaregiverLinksService } from '../src/caregiver-links/caregiver-links.service';
import { RedeemRateLimiter } from '../src/common/redeem-rate-limiter.service';
import { SystemConfigService } from '../src/common/system-config.service';
import { createUser, setupTestDatabase, truncateAll } from './setup';
import { APPROVAL_DEFAULT_REQUIRED } from '@sinalytix/domain';
import { EmergencyContactsService } from '../src/emergency-contacts/emergency-contacts.service';
import { approvalConfigRequiresApproval, withRlsContext } from '@sinalytix/db';

describe('ApprovalRequests + PatientApprovalConfig (Module 3, Faz 1 Slice 5)', () => {
  let ownerPool: Pool;
  let ownerDb: Kysely<Database>;
  let appPool: Pool;
  let appDb: Kysely<Database>;
  let redis: Redis;
  let approvals: ApprovalRequestsService;
  let caregiverLinks: CaregiverLinksService;
  let emergencyContacts: EmergencyContactsService;

  beforeAll(async () => {
    ({ ownerPool, ownerDb, appPool, appDb } = await setupTestDatabase());
    redis = new Redis(process.env.REDIS_URL as string);
    approvals = new ApprovalRequestsService(appDb);
    caregiverLinks = new CaregiverLinksService(
      appDb,
      new RedeemRateLimiter(redis),
      new ApprovalGateService(appDb, new SystemConfigService(appDb)),
      new SystemConfigService(appDb),
    );
    emergencyContacts = new EmergencyContactsService(
      appDb,
      new ApprovalGateService(appDb, new SystemConfigService(appDb)),
      redis,
    );
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
  const phone = () => `+1416560${String((seq += 1)).padStart(4, '0')}`;
  async function makePatient() {
    const p = await createUser(appDb, { phone_e164: phone(), roles: ['patient'], status: 'active' });
    await withRlsContext(appDb, { actingUserId: p.user_id }, (trx) =>
      trx.insertInto('patient_profiles').values({ user_id: p.user_id, first_name: 'Pat', last_name: 'Ient' }).execute(),
    );
    return p;
  }
  async function makeFamily(firstName = 'Fam') {
    const f = await createUser(appDb, { phone_e164: phone(), roles: ['family'], status: 'active' });
    // family_profiles carries the display name the approvals screen shows.
    await ownerDb.insertInto('family_profiles').values({ user_id: f.user_id, first_name: firstName, last_name: 'Member' }).execute();
    return f;
  }
  async function makeCaregiver(firstName = 'Care') {
    const c = await createUser(appDb, { phone_e164: phone(), roles: ['caregiver'], status: 'active' });
    await ownerDb.insertInto('caregiver_profiles').values({ user_id: c.user_id, role: 'psw', first_name: firstName, last_name: 'Giver' }).execute();
    return c;
  }

  // Fixtures seeded via the owner connection (bypasses RLS — setup only).
  async function seedActiveFamilyLink(patientId: string, familyId: string) {
    await ownerDb
      .insertInto('patient_family_links')
      .values({ patient_id: patientId, family_user_id: familyId, relationship: 'child', status: 'active', source: 'code', linked_at: new Date() })
      .execute();
  }
  async function seedLinkedCaregiver(patientId: string, caregiverId: string) {
    const row = await ownerDb
      .insertInto('caregiver_links')
      .values({
        patient_id: patientId,
        caregiver_id: caregiverId,
        code: `C${(seq += 1)}`.padEnd(6, 'X'),
        qr_payload: `qr${seq}`,
        status: 'linked',
        expires_at: new Date(Date.now() + 3600_000),
        linked_at: new Date(),
      })
      .returning('link_id')
      .executeTakeFirstOrThrow();
    return row.link_id;
  }
  async function requireApproval(patientId: string) {
    await approvals.upsertConfig(patientId, patientId, { action_type: 'caregiver_link_change', requires_approval: true });
  }
  async function linkStatus(linkId: string): Promise<string | undefined> {
    const r = await ownerDb.selectFrom('caregiver_links').select('status').where('link_id', '=', linkId).executeTakeFirst();
    return r?.status;
  }

  describe('PatientApprovalConfig (PATCH upsert)', () => {
    it('patient sets and updates a per-action config (composite PK, idempotent upsert)', async () => {
      const patient = await makePatient();
      const a = await approvals.upsertConfig(patient.user_id, patient.user_id, { action_type: 'caregiver_link_change', requires_approval: true });
      expect(a.requires_approval).toBe(true);
      const b = await approvals.upsertConfig(patient.user_id, patient.user_id, { action_type: 'caregiver_link_change', requires_approval: false });
      expect(b.requires_approval).toBe(false);
      const list = await approvals.listConfig(patient.user_id, patient.user_id);
      expect(list).toHaveLength(1);
    });

    it('a non-patient cannot set another patient\'s config (403)', async () => {
      const patient = await makePatient();
      const other = await makePatient();
      await expect(
        approvals.upsertConfig(patient.user_id, other.user_id, { action_type: 'caregiver_link_change', requires_approval: true }),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('the gate (via caregiver-initiated unlink)', () => {
    it('no config + no family at all -> runs immediately (nobody could approve)', async () => {
      const patient = await makePatient();
      const caregiver = await makeCaregiver();
      const linkId = await seedLinkedCaregiver(patient.user_id, caregiver.user_id);

      const res = await caregiverLinks.unlink(linkId, caregiver.user_id);
      expect(res.executed).toBe(true);
      expect(await linkStatus(linkId)).toBe('unlinked');
    });

    it('no config + an eligible family approver -> GATED, because FAM-12 defaults caregiver_link_change to "onay gerekli"', async () => {
      // Regression for D15/A5. Migration 0014's fallback was `false`, so an
      // unconfigured patient -- i.e. everyone, since nothing prompts them to
      // open the setting -- silently had the family safety net switched OFF.
      const patient = await makePatient();
      const family = await makeFamily();
      const caregiver = await makeCaregiver();
      await seedActiveFamilyLink(patient.user_id, family.user_id);
      const linkId = await seedLinkedCaregiver(patient.user_id, caregiver.user_id);

      const res = await caregiverLinks.unlink(linkId, caregiver.user_id);
      expect(res.executed).toBe(false);
      expect(res.status).toBe('pending');
      expect(await linkStatus(linkId)).toBe('linked');
    });

    it('an explicit opt-out turns the gate off (K4: the toggle belongs to the patient)', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const caregiver = await makeCaregiver();
      await seedActiveFamilyLink(patient.user_id, family.user_id);
      await approvals.upsertConfig(patient.user_id, patient.user_id, {
        action_type: 'caregiver_link_change',
        requires_approval: false,
      });
      const linkId = await seedLinkedCaregiver(patient.user_id, caregiver.user_id);

      const res = await caregiverLinks.unlink(linkId, caregiver.user_id);
      expect(res.executed).toBe(true);
      expect(res.approval_id).toBeNull();
      expect(await linkStatus(linkId)).toBe('unlinked');
    });

    it('GATED with an eligible family approver: caregiver unlink is DEFERRED (pending), link stays linked', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const caregiver = await makeCaregiver();
      await seedActiveFamilyLink(patient.user_id, family.user_id);
      await requireApproval(patient.user_id);
      const linkId = await seedLinkedCaregiver(patient.user_id, caregiver.user_id);

      const res = await caregiverLinks.unlink(linkId, caregiver.user_id);
      expect(res.executed).toBe(false);
      expect(res.status).toBe('pending');
      expect(res.approval_id).not.toBeNull();
      // The unlink has NOT happened yet — the link is still linked.
      expect(await linkStatus(linkId)).toBe('linked');
    });

    it('a second unlink attempt while one is already pending is rejected (409, no duplicate request)', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      const caregiver = await makeCaregiver();
      await seedActiveFamilyLink(patient.user_id, family.user_id);
      await requireApproval(patient.user_id);
      const linkId = await seedLinkedCaregiver(patient.user_id, caregiver.user_id);

      await caregiverLinks.unlink(linkId, caregiver.user_id); // first → pending
      await expect(caregiverLinks.unlink(linkId, caregiver.user_id)).rejects.toMatchObject({ status: 409 });

      const reqs = await approvals.listForPatient(patient.user_id, patient.user_id);
      expect(reqs.filter((r) => r.status === 'pending')).toHaveLength(1); // exactly one, not two
    });

    it('GATED but ZERO eligible approvers → auto_approved_no_approver, executes immediately', async () => {
      const patient = await makePatient();
      const caregiver = await makeCaregiver();
      await requireApproval(patient.user_id); // requires approval, but no family members exist
      const linkId = await seedLinkedCaregiver(patient.user_id, caregiver.user_id);

      const res = await caregiverLinks.unlink(linkId, caregiver.user_id);
      expect(res.status).toBe('auto_approved_no_approver');
      expect(res.executed).toBe(true);
      expect(await linkStatus(linkId)).toBe('unlinked'); // the real side effect happened
    });

    it("PATIENT-initiated unlink is ALSO gated -- that is FAM-12's headline case", async () => {
      // D15/A5: Faz 1 gated only the caregiver-initiated direction and let the
      // patient's own unlink through. FAM-12 section 3 names the opposite
      // explicitly ("Hasta ... mevcut bakiciyi cikariyor"), which is the whole
      // point of the family safety net in the dementia scenario.
      const patient = await makePatient();
      const family = await makeFamily();
      const caregiver = await makeCaregiver();
      await seedActiveFamilyLink(patient.user_id, family.user_id);
      await requireApproval(patient.user_id);
      const linkId = await seedLinkedCaregiver(patient.user_id, caregiver.user_id);

      const res = await caregiverLinks.unlink(linkId, patient.user_id);
      expect(res.executed).toBe(false);
      expect(res.status).toBe('pending');
      expect(await linkStatus(linkId)).toBe('linked');
    });

    it('a patient with NO eligible family approver is never blocked (K4 deadlock override)', async () => {
      // The PHIPA guard rail: a capable patient's own decision may be
      // supervised, never permanently prevented.
      const patient = await makePatient();
      const caregiver = await makeCaregiver();
      await requireApproval(patient.user_id);
      const linkId = await seedLinkedCaregiver(patient.user_id, caregiver.user_id);

      const res = await caregiverLinks.unlink(linkId, patient.user_id);
      expect(res.executed).toBe(true);
      expect(res.status).toBe('auto_approved_no_approver');
      expect(await linkStatus(linkId)).toBe('unlinked');
    });
  });

  describe('approve / reject (executes the deferred action)', () => {
    async function setupPending() {
      const patient = await makePatient();
      const family = await makeFamily('Gözde');
      const caregiver = await makeCaregiver();
      await seedActiveFamilyLink(patient.user_id, family.user_id);
      await requireApproval(patient.user_id);
      const linkId = await seedLinkedCaregiver(patient.user_id, caregiver.user_id);
      const res = await caregiverLinks.unlink(linkId, caregiver.user_id);
      return { patient, family, caregiver, linkId, approvalId: res.approval_id as string };
    }

    it('a family approver approving CARRIES OUT the caregiver unlink (real side effect)', async () => {
      const { family, linkId, approvalId } = await setupPending();
      expect(await linkStatus(linkId)).toBe('linked'); // still pending

      await approvals.decide(approvalId, family.user_id, 'approved');
      expect(await linkStatus(linkId)).toBe('unlinked'); // now executed
    });

    it('rejecting does NOT execute the action', async () => {
      const { family, linkId, approvalId } = await setupPending();
      await approvals.decide(approvalId, family.user_id, 'rejected');
      expect(await linkStatus(linkId)).toBe('linked'); // untouched
    });

    it('the requester (caregiver) cannot approve their own request (403)', async () => {
      const { caregiver, approvalId } = await setupPending();
      await expect(approvals.decide(approvalId, caregiver.user_id, 'approved')).rejects.toMatchObject({ status: 403 });
    });

    it('a family user NOT linked to this patient cannot see or decide the request (404, anti-enumeration)', async () => {
      const { approvalId } = await setupPending();
      const stranger = await makeFamily(); // a family user, but not linked to THIS patient
      // Not an active family member of this patient → RLS hides the request →
      // 404 (never leak its existence), same as any outsider. The only 403 is
      // the requester-approving-own case above; visibility and eligibility are
      // the same "active family member" condition, so there's no visible-but-
      // -ineligible third party.
      await expect(approvals.decide(approvalId, stranger.user_id, 'approved')).rejects.toMatchObject({ status: 404 });
    });

    it('a totally unrelated user cannot even see the request → 404 on decide', async () => {
      const { approvalId } = await setupPending();
      const outsider = await makePatient();
      await expect(approvals.decide(approvalId, outsider.user_id, 'approved')).rejects.toMatchObject({ status: 404 });
    });

    it('deciding an already-decided request is a 409', async () => {
      const { family, approvalId } = await setupPending();
      await approvals.decide(approvalId, family.user_id, 'approved');
      await expect(approvals.decide(approvalId, family.user_id, 'approved')).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('listForPatient — visibility + computed fields', () => {
    it('patient and their active family member both see the request; a stranger sees nothing', async () => {
      const patient = await makePatient();
      const family = await makeFamily('Gözde');
      const caregiver = await makeCaregiver('Ali');
      const stranger = await makeFamily();
      await seedActiveFamilyLink(patient.user_id, family.user_id);
      await requireApproval(patient.user_id);
      const linkId = await seedLinkedCaregiver(patient.user_id, caregiver.user_id);
      await caregiverLinks.unlink(linkId, caregiver.user_id);

      const asPatient = await approvals.listForPatient(patient.user_id, patient.user_id);
      expect(asPatient).toHaveLength(1);
      expect(asPatient[0].requested_by_role).toBe('caregiver');
      expect(asPatient[0].requested_by_name).toBe('Ali Giver'); // computed from caregiver_profiles
      expect(asPatient[0].description).toContain('Ali Giver');
      expect(asPatient[0].status).toBe('pending');

      const asFamily = await approvals.listForPatient(patient.user_id, family.user_id);
      expect(asFamily).toHaveLength(1);

      const asStranger = await approvals.listForPatient(patient.user_id, stranger.user_id);
      expect(asStranger).toHaveLength(0); // RLS hides it
    });
  });

  describe('per-action defaults match FAM-12 §3 (D15 item A5)', () => {
    // The constant in @sinalytix/domain and the SQL fallback in migration
    // 0016 are two copies of the same table. Asserted against the DB function
    // itself rather than by diffing files, so what's checked is the behavior
    // the gate actually gets.
    it.each(Object.entries(APPROVAL_DEFAULT_REQUIRED))(
      '%s → unconfigured default is %s',
      async (actionType, expected) => {
        const patient = await makePatient();
        const actual = await withRlsContext(appDb, { actingUserId: patient.user_id }, (trx) =>
          approvalConfigRequiresApproval(trx, patient.user_id, actionType),
        );
        expect(actual).toBe(expected);
      },
    );

    it('rejects an action_type outside the FAM-12 set at the DB layer', async () => {
      const patient = await makePatient();
      await expect(
        ownerDb
          .insertInto('patient_approval_configs')
          .values({ patient_id: patient.user_id, action_type: 'family_link_permission_change', requires_approval: true })
          .execute(),
      ).rejects.toThrow();
    });
  });

  describe('ec_change gate (FAM-12 §3, D15.4b)', () => {
    async function ecFor(patientId: string, phone = '+14165551111'): Promise<string> {
      const row = await ownerDb
        .insertInto('emergency_contacts')
        .values({
          patient_id: patientId,
          relationship: 'child',
          first_name: 'Test',
          last_name: 'Kisi',
          phone,
          sort_order: 1,
        })
        .returning('ec_id')
        .executeTakeFirstOrThrow();
      return row.ec_id;
    }

    it('onboarding is unaffected: a patient with no family adds a contact immediately', async () => {
      const patient = await makePatient();
      const res = await emergencyContacts.create(patient.user_id, patient.user_id, {
        relationship: 'child',
        first_name: 'Ilk',
        last_name: 'Kisi',
        phone: '+14165552001',
      });
      expect(res.executed).toBe(true);
      expect(res.contact).not.toBeNull();
    });

    it('defers an add once an active family member exists', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      await seedActiveFamilyLink(patient.user_id, family.user_id);

      const res = await emergencyContacts.create(patient.user_id, patient.user_id, {
        relationship: 'child',
        first_name: 'Bekleyen',
        last_name: 'Kisi',
        phone: '+14165552002',
      });
      expect(res.executed).toBe(false);
      expect(res.approval_id).toBeTruthy();
      // NOTHING has been written yet — the contact must not exist.
      const rows = await ownerDb
        .selectFrom('emergency_contacts')
        .selectAll()
        .where('patient_id', '=', patient.user_id)
        .execute();
      expect(rows).toHaveLength(0);
    });

    it('approval CARRIES OUT the deferred add (real side effect, via SECURITY DEFINER)', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      await seedActiveFamilyLink(patient.user_id, family.user_id);
      const res = await emergencyContacts.create(patient.user_id, patient.user_id, {
        relationship: 'child',
        first_name: 'Onayli',
        last_name: 'Kisi',
        phone: '+14165552003',
      });

      await approvals.decide(res.approval_id as string, family.user_id, 'approved');

      const rows = await ownerDb
        .selectFrom('emergency_contacts')
        .selectAll()
        .where('patient_id', '=', patient.user_id)
        .where('deleted_at', 'is', null)
        .execute();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.first_name).toBe('Onayli');
      expect(rows[0]?.sort_order).toBe(1);
      expect(rows[0]?.phone_verified).toBe(false);
    });

    it('rejection leaves nothing behind', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      await seedActiveFamilyLink(patient.user_id, family.user_id);
      const res = await emergencyContacts.create(patient.user_id, patient.user_id, {
        relationship: 'child',
        first_name: 'Reddedilen',
        last_name: 'Kisi',
        phone: '+14165552004',
      });

      await approvals.decide(res.approval_id as string, family.user_id, 'rejected');
      const rows = await ownerDb.selectFrom('emergency_contacts').selectAll().execute();
      expect(rows).toHaveLength(0);
    });

    it('defers a REMOVE and carries it out on approval', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      await seedActiveFamilyLink(patient.user_id, family.user_id);
      const ecId = await ecFor(patient.user_id);

      const res = await emergencyContacts.remove(ecId, patient.user_id);
      expect(res.executed).toBe(false);
      let row = await ownerDb.selectFrom('emergency_contacts').selectAll().where('ec_id', '=', ecId).executeTakeFirstOrThrow();
      expect(row.deleted_at).toBeNull();

      await approvals.decide(res.approval_id as string, family.user_id, 'approved');
      row = await ownerDb.selectFrom('emergency_contacts').selectAll().where('ec_id', '=', ecId).executeTakeFirstOrThrow();
      expect(row.deleted_at).not.toBeNull();
      expect(row.sort_order).toBeNull();
    });

    it('an approved phone EDIT clears phone_verified (the old number is no longer proven)', async () => {
      const patient = await makePatient();
      const family = await makeFamily();
      await seedActiveFamilyLink(patient.user_id, family.user_id);
      const ecId = await ecFor(patient.user_id, '+14165552005');
      await ownerDb.updateTable('emergency_contacts').set({ phone_verified: true }).where('ec_id', '=', ecId).execute();

      const res = await emergencyContacts.update(ecId, patient.user_id, { phone: '+14165552006' });
      expect(res.executed).toBe(false);
      await approvals.decide(res.approval_id as string, family.user_id, 'approved');

      const row = await ownerDb.selectFrom('emergency_contacts').selectAll().where('ec_id', '=', ecId).executeTakeFirstOrThrow();
      expect(row.phone).toBe('+14165552006');
      expect(row.phone_verified).toBe(false);
    });

    it('SECURITY: the executors are reachable ONLY through an approval — a family member still cannot write an EC directly', async () => {
      // The D12 Critical, re-asserted. Slice 3 gave family members EC write
      // access through an over-broad RLS UPDATE policy; the deferred-execution
      // feature is a second reason someone might reach for one. There is
      // still no family UPDATE/DELETE policy on this table, and the
      // SECURITY DEFINER executors authorize on the request's patient_id.
      const patient = await makePatient();
      const family = await makeFamily();
      await seedActiveFamilyLink(patient.user_id, family.user_id);
      const ecId = await ecFor(patient.user_id, '+14165552007');

      const direct = await withRlsContext(appDb, { actingUserId: family.user_id }, (trx) =>
        trx
          .updateTable('emergency_contacts')
          .set({ phone: '+19999999999' })
          .where('ec_id', '=', ecId)
          .executeTakeFirst(),
      );
      expect(Number(direct.numUpdatedRows)).toBe(0);

      const softDelete = await withRlsContext(appDb, { actingUserId: family.user_id }, (trx) =>
        trx.updateTable('emergency_contacts').set({ deleted_at: new Date() }).where('ec_id', '=', ecId).executeTakeFirst(),
      );
      expect(Number(softDelete.numUpdatedRows)).toBe(0);

      const row = await ownerDb.selectFrom('emergency_contacts').selectAll().where('ec_id', '=', ecId).executeTakeFirstOrThrow();
      expect(row.phone).toBe('+14165552007');
      expect(row.deleted_at).toBeNull();
    });

    it('SECURITY: an approver cannot redirect the write to another patient by tampering with the payload', async () => {
      // The executors take patient_id from `approval_requests.patient_id`,
      // never from the payload — so even a payload rewritten in the DB cannot
      // move the write to a different patient's contacts.
      const patient = await makePatient();
      const victim = await makePatient();
      const family = await makeFamily();
      await seedActiveFamilyLink(patient.user_id, family.user_id);
      const res = await emergencyContacts.create(patient.user_id, patient.user_id, {
        relationship: 'child',
        first_name: 'Hedef',
        last_name: 'Kisi',
        phone: '+14165552008',
      });

      await ownerDb
        .updateTable('approval_requests')
        .set({ action_payload: { op: 'create', patient_id: victim.user_id, relationship: 'child', first_name: 'X', last_name: 'Y', phone: '+14165552009' } })
        .where('approval_id', '=', res.approval_id as string)
        .execute();

      await approvals.decide(res.approval_id as string, family.user_id, 'approved');

      const victimRows = await ownerDb
        .selectFrom('emergency_contacts')
        .selectAll()
        .where('patient_id', '=', victim.user_id)
        .execute();
      expect(victimRows).toHaveLength(0);
    });
  });
});
