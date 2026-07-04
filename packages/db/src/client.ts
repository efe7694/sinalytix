import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import type { Database } from './types';

export function createPool(connectionString: string): Pool {
  return new Pool({ connectionString });
}

export function createDb(pool: Pool): Kysely<Database> {
  return new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
}

export interface RlsContext {
  actingUserId?: string;
  actingOrgId?: string;
  appContext?: string;
  actingRoles?: string[];
}

/**
 * Runs `fn` inside a transaction with RLS session variables set via
 * set_config(..., true) (== SET LOCAL — cleared at commit/rollback).
 * Module 1 §11 / Module 3 §1.3: every request sets these before touching
 * RLS-protected tables. Leave a field undefined for pre-auth requests that
 * haven't established that piece of context yet (see packages/db/README
 * bootstrap policies on `users`/`sessions`/etc.).
 */
export async function withRlsContext<T>(
  db: Kysely<Database>,
  ctx: RlsContext,
  fn: (trx: Kysely<Database>) => Promise<T>,
): Promise<T> {
  return db.transaction().execute(async (trx) => {
    if (ctx.actingUserId) {
      await sql`select set_config('app.acting_user_id', ${ctx.actingUserId}, true)`.execute(trx);
    }
    if (ctx.actingOrgId) {
      await sql`select set_config('app.acting_org_id', ${ctx.actingOrgId}, true)`.execute(trx);
    }
    if (ctx.appContext) {
      await sql`select set_config('app.app_context', ${ctx.appContext}, true)`.execute(trx);
    }
    if (ctx.actingRoles && ctx.actingRoles.length > 0) {
      await sql`select set_config('app.acting_roles', ${ctx.actingRoles.join(',')}, true)`.execute(trx);
    }
    return fn(trx);
  });
}

/**
 * Sets a single RLS session variable mid-transaction — for flows that only
 * learn `actingUserId` partway through (e.g. signup creates the `users` row
 * under the bootstrap policy, then must set this before inserting the first
 * `sessions` row in the same transaction).
 */
export async function setRlsVar(
  trx: Kysely<Database>,
  key: 'app.acting_user_id' | 'app.acting_org_id' | 'app.app_context' | 'app.acting_roles',
  value: string,
): Promise<void> {
  await sql`select set_config(${key}, ${value}, true)`.execute(trx);
}

export type { Database } from './types';
