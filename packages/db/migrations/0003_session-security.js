/**
 * Faz 0 — Session, RefreshToken, TOTPSecret, BackupCode, RecoveryToken,
 * DeviceFingerprint, LoginAttempt, IPBlock (Module 1 §3.5, Dictionary §1).
 *
 * Bootstrapping note: login/OTP-verify/refresh all need to look up a user
 * *before* app.acting_user_id can be set (that's the whole point of the
 * lookup). Rather than grant the app's DB role a blanket RLS bypass, three
 * narrow SECURITY DEFINER functions expose only the columns auth needs. Every
 * other query against these tables goes through normal RLS once the app sets
 * app.acting_user_id right after a successful lookup, in the same transaction,
 * before writing the Session/RefreshToken rows.
 *
 * RecoveryToken table is created (Module 1 §3.5 primitive) but no endpoint is
 * wired yet — Module 2 §3.1 doesn't specify a password-reset/recovery contract
 * for Faz 0, so building one now would be inventing unspecified behavior.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE sessions (
      session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(user_id),
      app_context text NOT NULL CHECK (app_context IN ('patient','family','caregiver','hcp')),
      platform text NOT NULL CHECK (platform IN ('mobile_ios','mobile_android','web')),
      device_label text,
      max_at timestamptz NOT NULL,
      idle_at timestamptz NOT NULL,
      device_fp_hash text,
      ip_hash text,
      ua_hash text,
      country_code text,
      revoked_at timestamptz,
      revoke_reason text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY sessions_self ON sessions FOR ALL
      USING (user_id = app_acting_user_id())
      WITH CHECK (user_id = app_acting_user_id());
  `);

  pgm.sql(`
    CREATE TABLE refresh_tokens (
      refresh_token_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid NOT NULL REFERENCES sessions(session_id),
      token_hash text NOT NULL UNIQUE,
      used_at timestamptz,
      rotated_to_token_id uuid REFERENCES refresh_tokens(refresh_token_id),
      revoked_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
    CREATE POLICY refresh_tokens_via_session ON refresh_tokens FOR ALL
      USING (EXISTS (
        SELECT 1 FROM sessions s WHERE s.session_id = refresh_tokens.session_id
        AND s.user_id = app_acting_user_id()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM sessions s WHERE s.session_id = refresh_tokens.session_id
        AND s.user_id = app_acting_user_id()
      ));
  `);

  pgm.sql(`
    CREATE TABLE totp_secrets (
      user_id uuid PRIMARY KEY REFERENCES users(user_id),
      secret_encrypted text NOT NULL,
      confirmed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE totp_secrets ENABLE ROW LEVEL SECURITY;
    CREATE POLICY totp_secrets_self ON totp_secrets FOR ALL
      USING (user_id = app_acting_user_id())
      WITH CHECK (user_id = app_acting_user_id());
  `);

  pgm.sql(`
    CREATE TABLE backup_codes (
      backup_code_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(user_id),
      code_hash text NOT NULL,
      used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE backup_codes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY backup_codes_self ON backup_codes FOR ALL
      USING (user_id = app_acting_user_id())
      WITH CHECK (user_id = app_acting_user_id());
  `);

  pgm.sql(`
    CREATE TABLE recovery_tokens (
      recovery_token_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(user_id),
      token_hash text NOT NULL UNIQUE,
      purpose text NOT NULL,
      expires_at timestamptz NOT NULL,
      used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE recovery_tokens ENABLE ROW LEVEL SECURITY;
    CREATE POLICY recovery_tokens_self ON recovery_tokens FOR ALL
      USING (user_id = app_acting_user_id())
      WITH CHECK (user_id = app_acting_user_id());
  `);

  pgm.sql(`
    CREATE TABLE device_fingerprints (
      device_fingerprint_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(user_id),
      fingerprint_hash text NOT NULL,
      trusted boolean NOT NULL DEFAULT false,
      device_label text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;
    CREATE POLICY device_fingerprints_self ON device_fingerprints FOR ALL
      USING (user_id = app_acting_user_id())
      WITH CHECK (user_id = app_acting_user_id());
  `);

  // login_attempts / ip_blocks have no per-row "owner" — they're security
  // telemetry the app must read/write on every request regardless of auth
  // state (rate-limiting happens *before* an acting user is known). RLS is
  // still enabled for governance consistency, but permissively.
  pgm.sql(`
    CREATE TABLE login_attempts (
      login_attempt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES users(user_id),
      identifier_hash text NOT NULL,
      ip_hash text,
      ua_hash text,
      success boolean NOT NULL,
      attempted_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
    CREATE POLICY login_attempts_insert ON login_attempts FOR INSERT WITH CHECK (true);
    CREATE POLICY login_attempts_read ON login_attempts FOR SELECT USING (true);
  `);

  pgm.sql(`
    CREATE TABLE ip_blocks (
      ip_block_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ip_hash text NOT NULL,
      reason text NOT NULL,
      blocked_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz
    );
    ALTER TABLE ip_blocks ENABLE ROW LEVEL SECURITY;
    CREATE POLICY ip_blocks_insert ON ip_blocks FOR INSERT WITH CHECK (true);
    CREATE POLICY ip_blocks_read ON ip_blocks FOR SELECT USING (true);
  `);

  // ── Narrow pre-auth lookups (SECURITY DEFINER) ──────────────────────────
  // NOTE: in production these should be GRANTed only to the api-monolith's DB
  // role once real role separation exists (Module 3 §1.3). Local dev uses a
  // single Postgres role that already owns every table, so REVOKE/GRANT here
  // wouldn't add real protection yet — revisit when per-service IAM/DB roles
  // are provisioned (deployment work, not a Faz 0 schema concern).

  pgm.sql(`
    CREATE OR REPLACE FUNCTION auth_find_user_by_phone(p_phone text)
    RETURNS TABLE(user_id uuid, status text, roles text[], locale text, auth_methods text[])
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT user_id, status, roles, locale, auth_methods
      FROM users WHERE phone_e164 = p_phone AND deleted_at IS NULL;
    $$;
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION auth_find_user_by_email(p_email citext)
    RETURNS TABLE(
      user_id uuid, status text, roles text[], locale text,
      auth_methods text[], password_hash text
    )
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT user_id, status, roles, locale, auth_methods, password_hash
      FROM users WHERE email = p_email AND deleted_at IS NULL;
    $$;
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION auth_find_refresh_token(p_token_hash text)
    RETURNS TABLE(
      refresh_token_id uuid, session_id uuid, user_id uuid,
      used_at timestamptz, revoked_at timestamptz, rotated_to_token_id uuid
    )
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT rt.refresh_token_id, rt.session_id, s.user_id, rt.used_at, rt.revoked_at, rt.rotated_to_token_id
      FROM refresh_tokens rt JOIN sessions s ON s.session_id = rt.session_id
      WHERE rt.token_hash = p_token_hash;
    $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP FUNCTION IF EXISTS auth_find_refresh_token(text);`);
  pgm.sql(`DROP FUNCTION IF EXISTS auth_find_user_by_email(citext);`);
  pgm.sql(`DROP FUNCTION IF EXISTS auth_find_user_by_phone(text);`);
  pgm.sql(`DROP TABLE IF EXISTS ip_blocks;`);
  pgm.sql(`DROP TABLE IF EXISTS login_attempts;`);
  pgm.sql(`DROP TABLE IF EXISTS device_fingerprints;`);
  pgm.sql(`DROP TABLE IF EXISTS recovery_tokens;`);
  pgm.sql(`DROP TABLE IF EXISTS backup_codes;`);
  pgm.sql(`DROP TABLE IF EXISTS totp_secrets;`);
  pgm.sql(`DROP TABLE IF EXISTS refresh_tokens;`);
  pgm.sql(`DROP TABLE IF EXISTS sessions;`);
};
