import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import { withRlsContext } from '@sinalytix/db';
import type { Pool } from 'pg';
import { ConsentGrantsService } from '../src/consent-grants/consent-grants.service';
import { createUser, setupTestDatabase, truncateAll } from './setup';

describe('ConsentGrantsService (Module 2 §3.2, Faz 1 Slice 1)', () => {
  let ownerPool: Pool;
  let ownerDb: Kysely<Database>;
  let appPool: Pool;
  let appDb: Kysely<Database>;
  let service: ConsentGrantsService;

  beforeAll(async () => {
    ({ ownerPool, ownerDb, appPool, appDb } = await setupTestDatabase());
    service = new ConsentGrantsService(appDb);
  });

  beforeEach(async () => {
    await truncateAll(ownerDb);
  });

  afterAll(async () => {
    await ownerPool.end();
    await appPool.end();
  });

  let seq = 0;
  function phone(): string {
    seq += 1;
    return `+1416556${String(seq).padStart(4, '0')}`;
  }
  async function makeUser(roles: string[]) {
    return createUser(appDb, { phone_e164: phone(), roles, status: 'active' });
  }

  describe('create()', () => {
    it('lets a patient create a grant on their own data', async () => {
      const patient = await makeUser(['patient']);
      const caregiver = await makeUser(['caregiver']);

      const grant = await service.create(patient.user_id, patient.user_id, {
        granted_to_kind: 'caregiver',
        granted_to_id: caregiver.user_id,
        scope: ['medications'],
        permission: 'permit',
      });

      expect(grant.patient_id).toBe(patient.user_id);
      expect(grant.granted_to_id).toBe(caregiver.user_id);
      expect(grant.granted_by).toBe(patient.user_id);
      expect(grant.revoked_at).toBeNull();
    });

    it('blocks a direct family_member-kind grant creation — system-only, written by createBaseline (409)', async () => {
      const patient = await makeUser(['patient']);
      const family = await makeUser(['family']);

      await expect(
        service.create(patient.user_id, patient.user_id, {
          granted_to_kind: 'family_member',
          granted_to_id: family.user_id,
          scope: ['medications'],
          permission: 'permit',
        }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('forbids a stranger (not the patient, no active SDM declaration) from creating a grant (403)', async () => {
      const patient = await makeUser(['patient']);
      const stranger = await makeUser(['patient']);

      await expect(
        service.create(patient.user_id, stranger.user_id, {
          granted_to_kind: 'caregiver',
          granted_to_id: stranger.user_id,
          scope: ['medications'],
          permission: 'permit',
        }),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('lets an active SDM create a grant on the patient\'s behalf', async () => {
      const patient = await makeUser(['patient']);
      const sdmUser = await makeUser(['family']);
      const clinician = await makeUser(['clinician']);
      const caregiver = await makeUser(['caregiver']);

      await service.createSdmDeclaration(patient.user_id, clinician.user_id, ['clinician'], {
        sdm_user_id: sdmUser.user_id,
        province_rule: 'ON_HCCA',
      });

      const grant = await service.create(patient.user_id, sdmUser.user_id, {
        granted_to_kind: 'caregiver',
        granted_to_id: caregiver.user_id,
        scope: ['medications'],
        permission: 'permit',
      });
      expect(grant.granted_by).toBe(sdmUser.user_id);
    });

    it('an inactive (not-yet-activated) SDM declaration does not authorize grant creation', async () => {
      const patient = await makeUser(['patient']);
      const sdmUser = await makeUser(['family']);
      const caregiver = await makeUser(['caregiver']);

      // Seed an SDM row directly with active=false — createSdmDeclaration
      // always writes active=true today (no deactivation flow exists yet),
      // so this uses the owner connection purely to construct the fixture.
      await ownerDb
        .insertInto('sdm_declarations')
        .values({ patient_id: patient.user_id, sdm_user_id: sdmUser.user_id, active: false })
        .execute();

      await expect(
        service.create(patient.user_id, sdmUser.user_id, {
          granted_to_kind: 'caregiver',
          granted_to_id: caregiver.user_id,
          scope: ['medications'],
          permission: 'permit',
        }),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('list() — RLS cross-tenant isolation', () => {
    it('patient A cannot see patient B\'s grants', async () => {
      const patientA = await makeUser(['patient']);
      const patientB = await makeUser(['patient']);
      const caregiver = await makeUser(['caregiver']);

      await service.create(patientA.user_id, patientA.user_id, {
        granted_to_kind: 'caregiver',
        granted_to_id: caregiver.user_id,
        scope: ['medications'],
        permission: 'permit',
      });
      await service.create(patientB.user_id, patientB.user_id, {
        granted_to_kind: 'caregiver',
        granted_to_id: caregiver.user_id,
        scope: ['medications'],
        permission: 'permit',
      });

      const asPatientA = await service.list(patientB.user_id, patientA.user_id, { limit: 25 });
      expect(asPatientA.data).toHaveLength(0);
    });

    it('a grantee sees only grants naming them, not the patient\'s other grants', async () => {
      const patient = await makeUser(['patient']);
      const caregiverA = await makeUser(['caregiver']);
      const caregiverB = await makeUser(['caregiver']);

      await service.create(patient.user_id, patient.user_id, {
        granted_to_kind: 'caregiver',
        granted_to_id: caregiverA.user_id,
        scope: ['medications'],
        permission: 'permit',
      });
      await service.create(patient.user_id, patient.user_id, {
        granted_to_kind: 'caregiver',
        granted_to_id: caregiverB.user_id,
        scope: ['labs'],
        permission: 'permit',
      });

      const asCaregiverA = await service.list(patient.user_id, caregiverA.user_id, { limit: 25 });
      expect(asCaregiverA.data).toHaveLength(1);
      expect(asCaregiverA.data[0]?.granted_to_id).toBe(caregiverA.user_id);
    });

    it('the patient sees all of their own grants', async () => {
      const patient = await makeUser(['patient']);
      const caregiverA = await makeUser(['caregiver']);
      const caregiverB = await makeUser(['caregiver']);

      await service.create(patient.user_id, patient.user_id, {
        granted_to_kind: 'caregiver',
        granted_to_id: caregiverA.user_id,
        scope: ['medications'],
        permission: 'permit',
      });
      await service.create(patient.user_id, patient.user_id, {
        granted_to_kind: 'caregiver',
        granted_to_id: caregiverB.user_id,
        scope: ['labs'],
        permission: 'permit',
      });

      const asPatient = await service.list(patient.user_id, patient.user_id, { limit: 25 });
      expect(asPatient.data).toHaveLength(2);
    });
  });

  describe('revoke()', () => {
    it('sets revoked_at and the grant disappears from an active-only read', async () => {
      const patient = await makeUser(['patient']);
      const caregiver = await makeUser(['caregiver']);
      const grant = await service.create(patient.user_id, patient.user_id, {
        granted_to_kind: 'caregiver',
        granted_to_id: caregiver.user_id,
        scope: ['medications'],
        permission: 'permit',
      });

      const revoked = await service.revoke(grant.grant_id, patient.user_id);
      expect(revoked.revoked_at).toBeTruthy();

      const afterRevoke = await service.list(patient.user_id, patient.user_id, { limit: 25 });
      expect(afterRevoke.data[0]?.revoked_at).not.toBeNull();
    });

    it('revoking an already-revoked grant is a 409', async () => {
      const patient = await makeUser(['patient']);
      const caregiver = await makeUser(['caregiver']);
      const grant = await service.create(patient.user_id, patient.user_id, {
        granted_to_kind: 'caregiver',
        granted_to_id: caregiver.user_id,
        scope: ['medications'],
        permission: 'permit',
      });
      await service.revoke(grant.grant_id, patient.user_id);

      await expect(service.revoke(grant.grant_id, patient.user_id)).rejects.toMatchObject({ status: 409 });
    });

    it('a stranger revoking a grant they cannot see gets 404, not 403 (varlık-sızdırmaz)', async () => {
      const patient = await makeUser(['patient']);
      const caregiver = await makeUser(['caregiver']);
      const stranger = await makeUser(['patient']);
      const grant = await service.create(patient.user_id, patient.user_id, {
        granted_to_kind: 'caregiver',
        granted_to_id: caregiver.user_id,
        scope: ['medications'],
        permission: 'permit',
      });

      await expect(service.revoke(grant.grant_id, stranger.user_id)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('createBaseline() — B5 lockbox never inherited', () => {
    it('strips lockbox categories from the scope even if a caller passes one', async () => {
      const patient = await makeUser(['patient']);
      const family = await makeUser(['family']);

      // Method is exercised via the patient-as-actor path today (satisfies
      // the current INSERT policy) — the family-member-as-actor path this
      // method is really meant for needs Slice 3's additional RLS policy
      // (see 0009_consent-grant.js's top-of-file comment).
      const baseline = await withRlsContext(appDb, { actingUserId: patient.user_id }, (trx) =>
        service.createBaseline(trx, {
          patientId: patient.user_id,
          familyUserId: family.user_id,
          grantedBy: patient.user_id,
          scope: ['medications', 'labs', 'mental_health', 'substance_use'],
        }),
      );

      const row = await ownerDb
        .selectFrom('consent_grants')
        .select('scope')
        .where('grant_id', '=', baseline.grant_id)
        .executeTakeFirstOrThrow();
      const scope = row.scope as string[];
      expect(scope).toEqual(['medications', 'labs']);
      expect(scope).not.toContain('mental_health');
      expect(scope).not.toContain('substance_use');
    });

    it('writes granted_to_kind=family_member and permission=permit regardless of input', async () => {
      const patient = await makeUser(['patient']);
      const family = await makeUser(['family']);

      const baseline = await withRlsContext(appDb, { actingUserId: patient.user_id }, (trx) =>
        service.createBaseline(trx, {
          patientId: patient.user_id,
          familyUserId: family.user_id,
          grantedBy: patient.user_id,
          scope: ['medications'],
        }),
      );

      const row = await ownerDb
        .selectFrom('consent_grants')
        .selectAll()
        .where('grant_id', '=', baseline.grant_id)
        .executeTakeFirstOrThrow();
      expect(row.granted_to_kind).toBe('family_member');
      expect(row.permission).toBe('permit');
      expect(row.granted_to_id).toBe(family.user_id);
    });
  });

  describe('SDM declarations', () => {
    it('a non-HCP (e.g. a patient) cannot create an SDM declaration (403)', async () => {
      const patient = await makeUser(['patient']);
      const sdmUser = await makeUser(['family']);

      await expect(
        service.createSdmDeclaration(patient.user_id, patient.user_id, ['patient'], {
          sdm_user_id: sdmUser.user_id,
          province_rule: 'ON_HCCA',
        }),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('a clinician can create an SDM declaration', async () => {
      const patient = await makeUser(['patient']);
      const sdmUser = await makeUser(['family']);
      const clinician = await makeUser(['clinician']);

      const declaration = await service.createSdmDeclaration(patient.user_id, clinician.user_id, ['clinician'], {
        sdm_user_id: sdmUser.user_id,
        province_rule: 'ON_HCCA',
      });
      expect(declaration.active).toBe(true);
      expect(declaration.activated_by).toBe(clinician.user_id);
    });

    it('duplicate (patient, sdm_user) declaration is a 409', async () => {
      const patient = await makeUser(['patient']);
      const sdmUser = await makeUser(['family']);
      const clinician = await makeUser(['clinician']);

      await service.createSdmDeclaration(patient.user_id, clinician.user_id, ['clinician'], {
        sdm_user_id: sdmUser.user_id,
        province_rule: 'ON_HCCA',
      });

      await expect(
        service.createSdmDeclaration(patient.user_id, clinician.user_id, ['clinician'], {
          sdm_user_id: sdmUser.user_id,
          province_rule: 'ON_HCCA',
        }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });
});
