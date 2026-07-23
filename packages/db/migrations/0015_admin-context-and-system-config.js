/**
 * K9 + K10 (Kanonik Sözlük v0.2 §0.1, Admin Panel PRD §6) — the admin
 * surface's schema footprint. DEVIATIONS.md D15 items A1, A2, A3.
 *
 * Admin Panel is the FIFTH surface and it did not exist when Faz 0 was
 * written, so three things are wrong in the shipped schema:
 *
 *   A1 (K9) `sessions.app_context` / `consent_records.app_context` CHECK
 *      constraints enumerate only the four consumer/HCP contexts. An admin
 *      session is a distinct `app_context` (never shared with another app,
 *      no SSO) — without this an admin literally cannot log in.
 *   A2 (K10) `admin_users.admin_role` is a single `text` and its value set
 *      was never enumerated (the 0002 comment says so explicitly: the old
 *      spec revision only said "admin_role enum"). K10 both enumerates it
 *      {support|credentialing|compliance|ops|superadmin} AND makes it
 *      multi-valued (`text[]`) — one admin can hold several roles.
 *   A3 (K10) `system_config` + `feature_flags` don't exist at all, and
 *      runtime constants (48h approval expiry, 15-min link TTL) are
 *      hardcoded — which K10 / Admin PRD A7 explicitly forbid.
 *
 * This migration is schema + seed only. The `/admin/*` API (S9), the
 * two-person rule, PHI reveal and the config-edit UI are the Admin phase's
 * work; per docs/spec/README.md a V1/later feature gets schema-preparation
 * here and no behavior.
 */

exports.shorthands = undefined;

// K10 / Admin PRD §1. `superadmin` is the only role that can approve another
// admin's two-person-rule request — enforced in the app layer (Admin phase),
// the CHECK here only constrains the value set.
const ADMIN_ROLES = `['support','credentialing','compliance','ops','superadmin']`;

exports.up = (pgm) => {
  // ── A1 (K9): `admin` app_context ───────────────────────────────────────
  // Both CHECKs were written inline in 0003/0004, so Postgres auto-named
  // them `<table>_app_context_check`. Dropping IF EXISTS + re-adding is the
  // only way to widen an inline CHECK; it's a pure widening (every existing
  // row still satisfies the new constraint), so no data migration.
  pgm.sql(`
    ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_app_context_check;
    ALTER TABLE sessions ADD CONSTRAINT sessions_app_context_check
      CHECK (app_context IN ('patient','family','caregiver','hcp','admin'));

    ALTER TABLE consent_records DROP CONSTRAINT IF EXISTS consent_records_app_context_check;
    ALTER TABLE consent_records ADD CONSTRAINT consent_records_app_context_check
      CHECK (app_context IN ('patient','family','caregiver','hcp','admin'));
  `);

  // ── A2 (K10): admin_role text → text[], enumerated ─────────────────────
  // USING array[admin_role] preserves every existing row's single role as a
  // one-element array. There are no admin_users rows in any environment yet
  // (no admin surface exists), but the conversion is written to be correct
  // if there were.
  pgm.sql(`
    ALTER TABLE admin_users
      ALTER COLUMN admin_role TYPE text[] USING ARRAY[admin_role];

    ALTER TABLE admin_users ADD CONSTRAINT admin_users_admin_role_check
      CHECK (
        COALESCE(array_length(admin_role, 1), 0) >= 1
        AND admin_role <@ ARRAY${ADMIN_ROLES}::text[]
      );
  `);

  // The 0002 policy was `FOR ALL USING/WITH CHECK (user_id = acting)`, which
  // means ANY authenticated user could INSERT an `admin_users` row naming
  // themselves. That was inert while no admin surface existed (privilege
  // actually flows from `users.roles`, which feeds `app.acting_roles`), but
  // it becomes a real self-elevation primitive the moment the admin surface
  // reads this table. Split into: self-SELECT (an admin reading their own
  // roles) + admin-only writes. Admin user *management* is a superadmin
  // action in the Admin phase (PRD §1); this is the DB-level floor.
  pgm.sql(`
    DROP POLICY IF EXISTS admin_users_self ON admin_users;

    CREATE POLICY admin_users_self_select ON admin_users FOR SELECT
      USING (user_id = app_acting_user_id() OR app_has_role('admin'));

    CREATE POLICY admin_users_admin_insert ON admin_users FOR INSERT
      WITH CHECK (app_has_role('admin'));
    CREATE POLICY admin_users_admin_update ON admin_users FOR UPDATE
      USING (app_has_role('admin')) WITH CHECK (app_has_role('admin'));
    CREATE POLICY admin_users_admin_delete ON admin_users FOR DELETE
      USING (app_has_role('admin'));
  `);

  // Same class of hole one level up: `users_self_update` (0002) has a USING
  // clause and no WITH CHECK, so Postgres reuses USING as WITH CHECK — a
  // user may UPDATE their own row, INCLUDING `roles` and `status`. No HTTP
  // path exposes those columns today (PATCH /me writes profile tables only),
  // but "no caller does it today" is exactly the assumption D12 punished:
  // a policy authorizes every code path that reaches the table, forever.
  // A column-level guard is the right tool here (RLS has no column-level
  // WITH CHECK), so: privilege columns may only change when the acting user
  // holds the admin role, or when there is no acting user at all (the
  // pre-auth bootstrap insert path in auth.service, which sets roles at
  // creation time).
  pgm.sql(`
    CREATE OR REPLACE FUNCTION reject_self_privilege_escalation() RETURNS trigger AS $$
    BEGIN
      IF (NEW.roles IS DISTINCT FROM OLD.roles OR NEW.status IS DISTINCT FROM OLD.status)
         AND app_acting_user_id() IS NOT NULL
         AND NOT app_has_role('admin') THEN
        RAISE EXCEPTION 'users.roles/status may not be changed by the acting user';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER users_no_self_privilege_escalation
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION reject_self_privilege_escalation();
  `);

  // ── A3 (K10): SystemConfig ─────────────────────────────────────────────
  // Admin PRD §6: key (PK) · value (jsonb) · value_schema · updated_by ·
  // updated_at · requires_second_approval. No history table in V0 — every
  // change is an `AuditLogEntry` (PRD §6, explicit).
  //
  // `value_schema` stores the JSON-schema-ish descriptor the admin UI uses
  // to render/validate an editor for the key. The authoritative validation
  // lives in `packages/config` (zod, shared by every service); this column
  // is the DB-side mirror so the admin UI doesn't have to ship the registry.
  pgm.sql(`
    CREATE TABLE system_config (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      value_schema jsonb NOT NULL DEFAULT '{}',
      requires_second_approval boolean NOT NULL DEFAULT false,
      -- Plain uuid, deliberately NOT a FK to users(user_id) — same choice as
      -- audit_log_entries (0005). Two reasons: config is reference data whose
      -- lifetime is independent of any account (deleting the admin who last
      -- edited a key must not be blocked by that key), and an FK here makes
      -- these rows collateral damage of a TRUNCATE users CASCADE — which is
      -- exactly how the test harness cleans up, silently wiping the seed and
      -- leaving every service running on registry defaults. Found by this
      -- migration's own test.
      updated_by uuid,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

    -- Dictionary §10: writer = Admin (ops), reader = ALL services. Config
    -- holds no PHI and every request path may need it (an SOS countdown
    -- length, a link TTL), so SELECT is unrestricted rather than role-gated.
    CREATE POLICY system_config_select ON system_config FOR SELECT USING (true);
    CREATE POLICY system_config_admin_insert ON system_config FOR INSERT
      WITH CHECK (app_has_role('admin'));
    CREATE POLICY system_config_admin_update ON system_config FOR UPDATE
      USING (app_has_role('admin')) WITH CHECK (app_has_role('admin'));
    CREATE POLICY system_config_admin_delete ON system_config FOR DELETE
      USING (app_has_role('admin'));
  `);

  // ── A3 (K10): FeatureFlag ──────────────────────────────────────────────
  // Admin PRD §6: key (PK) · enabled · scope {global|org|user_pct} ·
  // scope_value · app_context[] · updated_by/at.
  pgm.sql(`
    CREATE TABLE feature_flags (
      key text PRIMARY KEY,
      enabled boolean NOT NULL DEFAULT false,
      scope text NOT NULL DEFAULT 'global' CHECK (scope IN ('global','org','user_pct')),
      scope_value text,
      app_context text[] NOT NULL DEFAULT '{}',
      updated_by uuid, -- not a FK; see system_config above
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT feature_flags_app_context_check CHECK (
        app_context <@ ARRAY['patient','family','caregiver','hcp','admin']::text[]
      ),
      -- scope=global carries no scope_value; org/user_pct require one.
      CONSTRAINT feature_flags_scope_value_check CHECK (
        (scope = 'global' AND scope_value IS NULL) OR (scope <> 'global' AND scope_value IS NOT NULL)
      )
    );
    ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

    CREATE POLICY feature_flags_select ON feature_flags FOR SELECT USING (true);
    CREATE POLICY feature_flags_admin_insert ON feature_flags FOR INSERT
      WITH CHECK (app_has_role('admin'));
    CREATE POLICY feature_flags_admin_update ON feature_flags FOR UPDATE
      USING (app_has_role('admin')) WITH CHECK (app_has_role('admin'));
    CREATE POLICY feature_flags_admin_delete ON feature_flags FOR DELETE
      USING (app_has_role('admin'));
  `);

  // ── Seed: Admin PRD A7's V0 key set ────────────────────────────────────
  // Defaults duplicated in `packages/config` (the code-side registry, which
  // is also the fallback when a row is missing). The two are kept in sync by
  // a test that asserts every registry key exists here with the same value —
  // so this seed can't silently drift from the code default.
  //
  // requires_second_approval: Admin PRD A7 names `sos.*` as the
  // security-relevant keys needing the two-person rule.
  pgm.sql(`
    INSERT INTO system_config (key, value, requires_second_approval) VALUES
      ('sos.freshness_window_minutes', '240'::jsonb,  true),
      ('sos.phase1_cancel_sec',        '10'::jsonb,   true),
      ('sos.phase2_cancel_sec',        '30'::jsonb,   true),
      ('shift.alert_hours',            '[24,36,48]'::jsonb, false),
      ('approval.expiry_hours',        '48'::jsonb,   false),
      ('approval.reminder_hours',      '24'::jsonb,   false),
      ('carryover.max_days',           '7'::jsonb,    false),
      ('link.code_ttl_min',            '15'::jsonb,   false),
      ('upload.credential_mb',         '10'::jsonb,   false),
      ('upload.clinical_mb',           '25'::jsonb,   false),
      ('ai.daily_cost_cap_user',       '5'::jsonb,    false),
      ('ai.daily_cost_cap_org',        '50'::jsonb,   false)
    ON CONFLICT (key) DO NOTHING;
  `);

  // `ai.kill_switch` — Admin PRD A7. Semantics are deliberately
  // "enabled = the switch is ENGAGED = AI surfaces are OFF", so the safe
  // default (AI available) is `false`. Seeded now because the switch must
  // exist before the first AI surface does, not after; no AI code reads it
  // until Faz 6 (schema-preparation, per docs/spec/README.md).
  pgm.sql(`
    INSERT INTO feature_flags (key, enabled, scope, app_context) VALUES
      ('ai.kill_switch', false, 'global', ARRAY['patient','family','caregiver','hcp']::text[])
    ON CONFLICT (key) DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS feature_flags;`);
  pgm.sql(`DROP TABLE IF EXISTS system_config;`);

  pgm.sql(`
    DROP TRIGGER IF EXISTS users_no_self_privilege_escalation ON users;
    DROP FUNCTION IF EXISTS reject_self_privilege_escalation();
  `);

  pgm.sql(`
    DROP POLICY IF EXISTS admin_users_admin_delete ON admin_users;
    DROP POLICY IF EXISTS admin_users_admin_update ON admin_users;
    DROP POLICY IF EXISTS admin_users_admin_insert ON admin_users;
    DROP POLICY IF EXISTS admin_users_self_select ON admin_users;
    CREATE POLICY admin_users_self ON admin_users FOR ALL
      USING (user_id = app_acting_user_id())
      WITH CHECK (user_id = app_acting_user_id());

    ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_admin_role_check;
    ALTER TABLE admin_users
      ALTER COLUMN admin_role TYPE text USING admin_role[1];
  `);

  pgm.sql(`
    ALTER TABLE consent_records DROP CONSTRAINT IF EXISTS consent_records_app_context_check;
    ALTER TABLE consent_records ADD CONSTRAINT consent_records_app_context_check
      CHECK (app_context IN ('patient','family','caregiver','hcp'));

    ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_app_context_check;
    ALTER TABLE sessions ADD CONSTRAINT sessions_app_context_check
      CHECK (app_context IN ('patient','family','caregiver','hcp'));
  `);
};
