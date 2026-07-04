import { Inject, Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import { withRlsContext } from '@sinalytix/db';
import { AppContext, type UserPublic } from '@sinalytix/domain';
import { KYSELY } from '../common/db.module';
import type { AuthContext } from '../common/auth-context.guard';
import type { PatchMeBody } from './dto';

/**
 * Profile-extension rows (Module 1 §3.2) are created empty at signup time
 * (patient/family/caregiver only — HCP's PractitionerRole is provisioned
 * separately via org onboarding, C17b, not a Faz 0 endpoint) so GET/PATCH
 * /me never has to special-case a missing row.
 */
@Injectable()
export class ProfileService {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async createDefaultProfile(trx: Kysely<Database>, userId: string, appContext: string): Promise<void> {
    if (appContext === AppContext.PATIENT) {
      await trx.insertInto('patient_profiles').values({ user_id: userId }).execute();
    } else if (appContext === AppContext.FAMILY) {
      await trx.insertInto('family_profiles').values({ user_id: userId }).execute();
    } else if (appContext === AppContext.CAREGIVER) {
      // role has no sensible default — caregiver onboarding must set it via
      // PATCH /me before the profile is meaningful; 'other' is a safe placeholder.
      await trx.insertInto('caregiver_profiles').values({ user_id: userId, role: 'other' }).execute();
    }
  }

  async getMe(auth: AuthContext): Promise<{ user: UserPublic; profile: Record<string, unknown> | null }> {
    return withRlsContext(this.db, { actingUserId: auth.userId }, async (trx) => {
      const user = await trx
        .selectFrom('users')
        .select(['user_id', 'email', 'email_verified', 'phone_e164', 'phone_verified', 'locale', 'roles', 'status'])
        .where('user_id', '=', auth.userId)
        .executeTakeFirstOrThrow();

      let profile: Record<string, unknown> | null = null;
      if (auth.appContext === AppContext.PATIENT) {
        profile = (await trx.selectFrom('patient_profiles').selectAll().where('user_id', '=', auth.userId).executeTakeFirst()) ?? null;
      } else if (auth.appContext === AppContext.FAMILY) {
        profile = (await trx.selectFrom('family_profiles').selectAll().where('user_id', '=', auth.userId).executeTakeFirst()) ?? null;
      } else if (auth.appContext === AppContext.CAREGIVER) {
        profile = (await trx.selectFrom('caregiver_profiles').selectAll().where('user_id', '=', auth.userId).executeTakeFirst()) ?? null;
      }

      return {
        user: {
          user_id: user.user_id,
          email: user.email,
          email_verified: user.email_verified,
          phone_e164: user.phone_e164,
          phone_verified: user.phone_verified,
          locale: user.locale as UserPublic['locale'],
          roles: user.roles as UserPublic['roles'],
          status: user.status as UserPublic['status'],
        },
        profile,
      };
    });
  }

  async patchMe(auth: AuthContext, patch: PatchMeBody): Promise<void> {
    await withRlsContext(this.db, { actingUserId: auth.userId }, async (trx) => {
      if (patch.locale) {
        await trx.updateTable('users').set({ locale: patch.locale, updated_at: new Date() }).where('user_id', '=', auth.userId).execute();
      }

      const nameFields = {
        ...(patch.first_name !== undefined ? { first_name: patch.first_name } : {}),
        ...(patch.last_name !== undefined ? { last_name: patch.last_name } : {}),
        ...(patch.avatar_url !== undefined ? { avatar_url: patch.avatar_url } : {}),
      };

      if (auth.appContext === AppContext.PATIENT && Object.keys(nameFields).length > 0) {
        await trx.updateTable('patient_profiles').set({ ...nameFields, updated_at: new Date() }).where('user_id', '=', auth.userId).execute();
      } else if (auth.appContext === AppContext.FAMILY) {
        const familyFields = { ...nameFields, ...(patch.dnd !== undefined ? { dnd: patch.dnd } : {}) };
        if (Object.keys(familyFields).length > 0) {
          await trx.updateTable('family_profiles').set({ ...familyFields, updated_at: new Date() }).where('user_id', '=', auth.userId).execute();
        }
      } else if (auth.appContext === AppContext.CAREGIVER) {
        const caregiverFields = {
          ...nameFields,
          ...(patch.availability_status !== undefined ? { availability_status: patch.availability_status } : {}),
        };
        if (Object.keys(caregiverFields).length > 0) {
          await trx.updateTable('caregiver_profiles').set({ ...caregiverFields, updated_at: new Date() }).where('user_id', '=', auth.userId).execute();
        }
      }
    });
  }
}
