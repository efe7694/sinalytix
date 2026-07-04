import { Inject, Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import { sql } from 'kysely';
import { withRlsContext } from '@sinalytix/db';
import type {
  CreateEmergencyContactRequest,
  EmergencyContactPublic,
  UpdateEmergencyContactRequest,
} from '@sinalytix/domain';
import type Redis from 'ioredis';
import { REDIS } from '../common/redis.module';
import { KYSELY } from '../common/db.module';
import { ProblemException } from '../common/problem.exception';
import { randomOtpCode } from '../common/hash.util';

const MAX_CONTACTS = 3;
const VERIFY_CODE_TTL_SECONDS = 5 * 60;
const VERIFY_REQUEST_LIMIT = 5;
const VERIFY_REQUEST_WINDOW_SECONDS = 60 * 60;
const VERIFY_FAIL_LIMIT = 5;
const VERIFY_LOCKOUT_SECONDS = 15 * 60;

function toPublic(row: {
  ec_id: string;
  patient_id: string;
  relationship: string;
  first_name: string;
  last_name: string;
  phone: string;
  phone_verified: boolean;
  sort_order: number | null;
  invite_status: string;
  linked_family_user_id: string | null;
  created_at: Date;
}): EmergencyContactPublic {
  if (row.sort_order === null) {
    // Every query in this service filters `deleted_at IS NULL`, and only a
    // soft-deleted row ever has a null sort_order (migration 0010) — a live
    // row reaching this function with one would be a bug in a query filter.
    throw new Error(`emergency_contacts row ${row.ec_id} has no sort_order but was read as active`);
  }
  return {
    ec_id: row.ec_id,
    patient_id: row.patient_id,
    relationship: row.relationship,
    first_name: row.first_name,
    last_name: row.last_name,
    phone: row.phone,
    phone_verified: row.phone_verified,
    sort_order: row.sort_order,
    invite_status: row.invite_status as EmergencyContactPublic['invite_status'],
    linked_family_user_id: row.linked_family_user_id,
    created_at: row.created_at.toISOString(),
  };
}

// Redis keys are scoped by ec_id, NOT phone hash — deliberately separate
// namespace from auth/otp.service.ts's login-OTP keys (same phone could be
// verifying as an EC for multiple different patients, and login-OTP vs.
// EC-phone-verify are different trust domains that shouldn't share a
// rate-limit bucket just because they happen to use the same phone number).
function codeKey(ecId: string): string {
  return `ec-verify:code:${ecId}`;
}
function requestCountKey(ecId: string): string {
  return `ec-verify:reqcount:${ecId}`;
}
function failCountKey(ecId: string): string {
  return `ec-verify:failcount:${ecId}`;
}
function lockoutKey(ecId: string): string {
  return `ec-verify:lockout:${ecId}`;
}

@Injectable()
export class EmergencyContactsService {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async create(patientId: string, actingUserId: string, body: CreateEmergencyContactRequest): Promise<EmergencyContactPublic> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      const active = await trx
        .selectFrom('emergency_contacts')
        .select('sort_order')
        .where('patient_id', '=', patientId)
        .where('deleted_at', 'is', null)
        .execute();
      if (active.length >= MAX_CONTACTS) {
        throw ProblemException.conflict(`En fazla ${MAX_CONTACTS} acil kişi eklenebilir.`);
      }
      // Lowest free 1-3 slot, not `count + 1` — removing a non-last contact
      // frees its own slot, not necessarily the highest one (e.g. remove
      // slot 1 of 2 active, then add: must reuse 1, not collide on 2).
      const taken = new Set(active.map((r) => r.sort_order));
      const nextSortOrder = [1, 2, 3].find((n) => !taken.has(n));
      if (nextSortOrder === undefined) {
        throw ProblemException.conflict(`En fazla ${MAX_CONTACTS} acil kişi eklenebilir.`);
      }

      const duplicatePhone = await trx
        .selectFrom('emergency_contacts')
        .select('ec_id')
        .where('patient_id', '=', patientId)
        .where('phone', '=', body.phone)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();
      if (duplicatePhone) {
        throw ProblemException.conflict('Bu telefon numarası zaten acil kişi listesinde.');
      }

      const row = await trx
        .insertInto('emergency_contacts')
        .values({
          patient_id: patientId,
          relationship: body.relationship,
          first_name: body.first_name,
          last_name: body.last_name,
          phone: body.phone,
          sort_order: nextSortOrder,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return toPublic(row);
    });
  }

  async list(patientId: string, actingUserId: string): Promise<EmergencyContactPublic[]> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      const rows = await trx
        .selectFrom('emergency_contacts')
        .selectAll()
        .where('patient_id', '=', patientId)
        .where('deleted_at', 'is', null)
        .orderBy('sort_order', 'asc')
        .execute();
      return rows.map(toPublic);
    });
  }

  async update(ecId: string, actingUserId: string, body: UpdateEmergencyContactRequest): Promise<EmergencyContactPublic> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      const existing = await trx
        .selectFrom('emergency_contacts')
        .select(['ec_id', 'phone'])
        .where('ec_id', '=', ecId)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();
      if (!existing) {
        throw ProblemException.notFound();
      }

      const phoneChanged = body.phone !== undefined && body.phone !== existing.phone;
      const row = await trx
        .updateTable('emergency_contacts')
        .set({
          ...(body.relationship !== undefined ? { relationship: body.relationship } : {}),
          ...(body.first_name !== undefined ? { first_name: body.first_name } : {}),
          ...(body.last_name !== undefined ? { last_name: body.last_name } : {}),
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
          // Changing phone invalidates any prior verification (Module 2 §3.3 inference).
          ...(phoneChanged ? { phone_verified: false } : {}),
        })
        .where('ec_id', '=', ecId)
        .returningAll()
        .executeTakeFirst();
      if (!row) {
        throw ProblemException.notFound();
      }
      return toPublic(row);
    });
  }

  async remove(ecId: string, actingUserId: string): Promise<void> {
    await withRlsContext(this.db, { actingUserId }, async (trx) => {
      const result = await trx
        .updateTable('emergency_contacts')
        // sort_order: null frees the slot for the DEFERRABLE unique
        // constraint (migration 0010) — NULLs never collide with each
        // other or with an active row's concrete 1-3 value.
        .set({ deleted_at: new Date(), sort_order: null })
        .where('ec_id', '=', ecId)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();
      if (Number(result.numUpdatedRows) === 0) {
        throw ProblemException.notFound();
      }
    });
  }

  /** Single multi-row UPDATE against a real DEFERRABLE constraint (migration
   * 0010) — deferred to transaction commit, so the intermediate swapped
   * state within this one statement/transaction never trips uniqueness.
   * (An earlier version relied on a plain unique index and assumed
   * statement-level checking would be enough; it isn't — Postgres validates
   * a non-deferrable index per row as each row is touched, found by this
   * method's own test.) */
  async reorder(patientId: string, actingUserId: string, orderedIds: string[]): Promise<EmergencyContactPublic[]> {
    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      const owned = await trx
        .selectFrom('emergency_contacts')
        .select('ec_id')
        .where('patient_id', '=', patientId)
        .where('deleted_at', 'is', null)
        .execute();
      const ownedIds = new Set(owned.map((r) => r.ec_id));
      if (orderedIds.length !== ownedIds.size || !orderedIds.every((id) => ownedIds.has(id))) {
        throw ProblemException.badRequest('ordered_ids hastanın mevcut acil kişi kümesiyle birebir eşleşmeli.');
      }

      const values = orderedIds.map((id, idx) => sql`(${id}::uuid, ${idx + 1}::int)`);
      await sql`
        UPDATE emergency_contacts AS ec
        SET sort_order = v.new_order
        FROM (VALUES ${sql.join(values, sql`, `)}) AS v(ec_id, new_order)
        WHERE ec.ec_id = v.ec_id AND ec.patient_id = ${patientId}
      `.execute(trx);

      // Must read back via this same `trx`, not `this.list()` — that helper
      // calls `withRlsContext(this.db, ...)` itself, which opens a brand new
      // transaction/connection. Under READ COMMITTED that second transaction
      // can't see this one's still-uncommitted UPDATE above, so it would
      // silently return the pre-swap rows instead of erroring (found by this
      // method's own test).
      const rows = await trx
        .selectFrom('emergency_contacts')
        .selectAll()
        .where('patient_id', '=', patientId)
        .where('deleted_at', 'is', null)
        .orderBy('sort_order', 'asc')
        .execute();
      return rows.map(toPublic);
    });
  }

  async requestPhoneVerification(ecId: string, actingUserId: string): Promise<void> {
    await withRlsContext(this.db, { actingUserId }, async (trx) => {
      const contact = await trx
        .selectFrom('emergency_contacts')
        .select(['ec_id', 'phone'])
        .where('ec_id', '=', ecId)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();
      if (!contact) {
        throw ProblemException.notFound();
      }

      const requests = await this.redis.incr(requestCountKey(ecId));
      if (requests === 1) {
        await this.redis.expire(requestCountKey(ecId), VERIFY_REQUEST_WINDOW_SECONDS);
      }
      if (requests > VERIFY_REQUEST_LIMIT) {
        throw ProblemException.tooManyRequests('Çok fazla kod isteği. Lütfen daha sonra tekrar deneyin.');
      }

      const code = randomOtpCode();
      await this.redis.set(codeKey(ecId), code, 'EX', VERIFY_CODE_TTL_SECONDS);

      // No SMS provider wired yet — same dev-only stand-in as auth/otp.service.ts.
      // eslint-disable-next-line no-console
      console.log(`[dev-only] EC phone-verify code for ${contact.phone}: ${code}`);
    });
  }

  async confirmPhoneVerification(ecId: string, actingUserId: string, code: string): Promise<EmergencyContactPublic> {
    const locked = await this.redis.get(lockoutKey(ecId));
    if (locked) {
      throw ProblemException.tooManyRequests('Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.', VERIFY_LOCKOUT_SECONDS);
    }

    const stored = await this.redis.get(codeKey(ecId));
    if (!stored || stored !== code) {
      const fails = await this.redis.incr(failCountKey(ecId));
      if (fails === 1) {
        await this.redis.expire(failCountKey(ecId), VERIFY_LOCKOUT_SECONDS);
      }
      if (fails >= VERIFY_FAIL_LIMIT) {
        await this.redis.set(lockoutKey(ecId), '1', 'EX', VERIFY_LOCKOUT_SECONDS);
        throw ProblemException.tooManyRequests('Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.', VERIFY_LOCKOUT_SECONDS);
      }
      throw ProblemException.badRequest('Kod hatalı veya süresi dolmuş.');
    }

    await this.redis.del(codeKey(ecId), failCountKey(ecId));

    return withRlsContext(this.db, { actingUserId }, async (trx) => {
      const row = await trx
        .updateTable('emergency_contacts')
        .set({ phone_verified: true })
        .where('ec_id', '=', ecId)
        .where('deleted_at', 'is', null)
        .returningAll()
        .executeTakeFirst();
      if (!row) {
        throw ProblemException.notFound();
      }
      return toPublic(row);
    });
  }
}
