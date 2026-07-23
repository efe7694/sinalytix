import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
// node-pg-migrate's package.json `exports` has no "." entry, only "./dist/*"
// subpaths — the bare specifier is unresolvable under strict-exports tools
// (Vite/Vitest), unlike plain Node `require`.
// @ts-expect-error — no types shipped for this subpath import
import runMigrations from 'node-pg-migrate/dist/index';
import { sql } from 'kysely';
import { createDb, createPool, withRlsContext } from '@sinalytix/db';
import type { Database } from '@sinalytix/db';
import type { Insertable, Kysely } from 'kysely';
import type { Pool } from 'pg';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../packages/db/migrations');

async function ensureDatabase(databaseUrl: string): Promise<void> {
  const target = new URL(databaseUrl);
  const dbName = target.pathname.replace(/^\//, '');
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres';
  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rows.length === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await client.end();
  }
}

async function ensureAppRolePassword(ownerUrl: string, appUrl: string): Promise<void> {
  const appPassword = new URL(appUrl).password;
  if (!appPassword) throw new Error('APP_DATABASE_URL has no password');
  const client = new Client({ connectionString: ownerUrl });
  await client.connect();
  try {
    await client.query(`ALTER ROLE sinalytix_app WITH LOGIN PASSWORD '${appPassword.replace(/'/g, "''")}'`);
  } finally {
    await client.end();
  }
}

export interface TestDbHandles {
  /** Owner connection (table owner — RLS does not apply). Use only for
   * fixture setup/teardown, never to assert RLS behavior. */
  ownerPool: Pool;
  ownerDb: Kysely<Database>;
  /** Non-owner app-role connection — the one RLS policies actually govern,
   * same role `core-api` itself connects as (DEVIATIONS.md D7). */
  appPool: Pool;
  appDb: Kysely<Database>;
}

export async function setupTestDatabase(): Promise<TestDbHandles> {
  const databaseUrl = process.env.DATABASE_URL;
  const appDatabaseUrl = process.env.APP_DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set (run tests via `pnpm test`, not vitest directly)');
  if (!appDatabaseUrl) throw new Error('APP_DATABASE_URL is not set');

  await ensureDatabase(databaseUrl);
  await runMigrations({
    databaseUrl,
    dir: MIGRATIONS_DIR,
    direction: 'up',
    migrationsTable: 'pgmigrations',
    log: () => {},
    verbose: false,
  });
  await ensureAppRolePassword(databaseUrl, appDatabaseUrl);

  const ownerPool = createPool(databaseUrl);
  const ownerDb = createDb(ownerPool);
  const appPool = createPool(appDatabaseUrl);
  const appDb = createDb(appPool);
  return { ownerPool, ownerDb, appPool, appDb };
}

/**
 * Per-test cleanup list. `system_config` / `feature_flags` are deliberately
 * ABSENT: they are migration-seeded reference data, not per-test fixtures —
 * truncating them would leave every service silently running on registry
 * defaults and make the config-read tests assert nothing. A test that needs
 * a different config value should edit the row and restore it.
 */
const DOMAIN_TABLES = [
  'activity_log',
  'care_task_occurrences',
  'care_tasks',
  'approval_requests',
  'patient_approval_configs',
  'caregiver_links',
  'patient_family_links',
  'family_link_codes',
  'emergency_contacts',
  'consent_grants',
  'sdm_declarations',
  'policy_decisions',
  'audit_log_entries',
  'consent_records',
  'oauth_identities',
  'ip_blocks',
  'login_attempts',
  'device_fingerprints',
  'recovery_tokens',
  'backup_codes',
  'totp_secrets',
  'refresh_tokens',
  'sessions',
  'admin_users',
  'caregiver_profiles',
  'family_profiles',
  'patient_profiles',
  'practitioner_roles',
  'organizations',
  'users',
];

/**
 * Inserts a `users` row via the RLS-governed app connection, the same way
 * production signup code does: user_id generated client-side with
 * acting_user_id set *before* the insert, since Postgres re-checks the
 * table's SELECT policy for RETURNING after INSERT (not just the INSERT
 * policy's WITH CHECK) — a DB-generated id can't satisfy that in advance.
 */
export async function createUser(
  appDb: Kysely<Database>,
  values: Omit<Insertable<Database['users']>, 'user_id'>,
): Promise<{ user_id: string }> {
  const userId = randomUUID();
  return withRlsContext(appDb, { actingUserId: userId }, (trx) =>
    trx
      .insertInto('users')
      .values({ user_id: userId, ...values })
      .returning(['user_id'])
      .executeTakeFirstOrThrow(),
  );
}

/** TRUNCATE doesn't fire per-row DELETE triggers (so the immutable-table
 * guard on consent_records/audit_log_entries/policy_decisions doesn't block
 * it) and isn't governed by RLS — safe for test cleanup, never used by
 * application code. */
export async function truncateAll(db: Kysely<Database>): Promise<void> {
  const tableList = sql.raw(DOMAIN_TABLES.map((t) => `"${t}"`).join(', '));
  await sql`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`.execute(db);
}
