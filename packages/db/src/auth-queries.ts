/**
 * Wrappers around the SECURITY DEFINER pre-auth lookup functions from
 * migration 0003_session-security.js — see that file's header comment for
 * why these exist instead of a blanket RLS bypass.
 */
import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Database } from './types';

export interface AuthUserLookup {
  user_id: string;
  status: string;
  roles: string[];
  locale: string;
  auth_methods: string[];
}

export async function findUserByPhone(
  db: Kysely<Database>,
  phone: string,
): Promise<AuthUserLookup | undefined> {
  const result = await sql<AuthUserLookup>`select * from auth_find_user_by_phone(${phone})`.execute(db);
  return result.rows[0];
}

export interface AuthUserLookupWithPassword extends AuthUserLookup {
  password_hash: string | null;
}

export async function findUserByEmail(
  db: Kysely<Database>,
  email: string,
): Promise<AuthUserLookupWithPassword | undefined> {
  const result = await sql<AuthUserLookupWithPassword>`select * from auth_find_user_by_email(${email})`.execute(
    db,
  );
  return result.rows[0];
}

export async function findUserByOauthSubject(
  db: Kysely<Database>,
  provider: 'apple_sso' | 'google_sso',
  subject: string,
): Promise<AuthUserLookup | undefined> {
  const result = await sql<AuthUserLookup>`select * from auth_find_user_by_oauth_subject(${provider}, ${subject})`.execute(
    db,
  );
  return result.rows[0];
}

export interface AuthRefreshTokenLookup {
  refresh_token_id: string;
  session_id: string;
  user_id: string;
  used_at: Date | null;
  revoked_at: Date | null;
  rotated_to_token_id: string | null;
}

export async function findRefreshTokenByHash(
  db: Kysely<Database>,
  tokenHash: string,
): Promise<AuthRefreshTokenLookup | undefined> {
  const result = await sql<AuthRefreshTokenLookup>`select * from auth_find_refresh_token(${tokenHash})`.execute(
    db,
  );
  return result.rows[0];
}
