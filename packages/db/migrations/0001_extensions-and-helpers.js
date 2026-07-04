/**
 * Extensions + reusable helper functions used by every later migration's
 * RLS policies and immutability triggers (Module 1 §1.4, §11).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // citext for case-insensitive unique email (Dictionary §1: `email citext`).
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS "citext";`);

  // Generic append-only guard, reused by every immutable table
  // (ConsentRecord now; AuditLogEntry/ai_interaction_log/ActivityLog/Message later).
  pgm.sql(`
    CREATE OR REPLACE FUNCTION reject_update_delete() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'Table % is append-only; % is not permitted', TG_TABLE_NAME, TG_OP;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Null-safe session-variable readers (Module 1 §11 session vars).
  // current_setting(..., true) returns NULL instead of erroring when unset,
  // e.g. pre-auth requests that haven't established an acting user yet.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION app_acting_user_id() RETURNS uuid AS $$
      SELECT NULLIF(current_setting('app.acting_user_id', true), '')::uuid;
    $$ LANGUAGE sql STABLE;
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION app_acting_org_id() RETURNS uuid AS $$
      SELECT NULLIF(current_setting('app.acting_org_id', true), '')::uuid;
    $$ LANGUAGE sql STABLE;
  `);

  // app.acting_roles is stored as a comma-separated string (Postgres GUCs are
  // text-only); this checks membership without every policy re-parsing it.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION app_has_role(role_name text) RETURNS boolean AS $$
      SELECT COALESCE(
        string_to_array(current_setting('app.acting_roles', true), ',') @> ARRAY[role_name],
        false
      );
    $$ LANGUAGE sql STABLE;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP FUNCTION IF EXISTS app_has_role(text);`);
  pgm.sql(`DROP FUNCTION IF EXISTS app_acting_org_id();`);
  pgm.sql(`DROP FUNCTION IF EXISTS app_acting_user_id();`);
  pgm.sql(`DROP FUNCTION IF EXISTS reject_update_delete();`);
  pgm.sql(`DROP EXTENSION IF EXISTS "citext";`);
};
