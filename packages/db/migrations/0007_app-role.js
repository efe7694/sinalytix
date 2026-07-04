/**
 * A non-owner application role for RLS to actually apply to.
 *
 * Bug found via the Faz 0 RLS-leak test: Postgres RLS policies are bypassed
 * by a table's OWNER (and superusers) unless the table is explicitly marked
 * `FORCE ROW LEVEL SECURITY`. Migrations run as `sinalytix` (docker-compose's
 * superuser-ish owner role), so if the app also connected as `sinalytix`,
 * every policy in this repo would be silently inert. This is exactly what
 * Module 3 §1.3 already specifies — "api-monolith DB'ye uygulama rolüyle
 * bağlanır" (a distinct application role, not the owner) — so this migration
 * makes the existing spec requirement actually true rather than aspirational.
 *
 * Default privileges are granted so *future* migrations' tables/functions
 * are automatically covered without repeating GRANT statements each time.
 * The role's password is set separately by
 * packages/db/scripts/ensure-app-role.ts (not embedded in a committed
 * migration file).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sinalytix_app') THEN
        CREATE ROLE sinalytix_app WITH LOGIN;
      END IF;
    END
    $$;
  `);

  pgm.sql(`GRANT USAGE ON SCHEMA public TO sinalytix_app;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sinalytix_app;`);
  pgm.sql(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO sinalytix_app;`);
  pgm.sql(`
    ALTER DEFAULT PRIVILEGES FOR ROLE sinalytix IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sinalytix_app;
  `);
  pgm.sql(`
    ALTER DEFAULT PRIVILEGES FOR ROLE sinalytix IN SCHEMA public
      GRANT EXECUTE ON FUNCTIONS TO sinalytix_app;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER DEFAULT PRIVILEGES FOR ROLE sinalytix IN SCHEMA public
      REVOKE EXECUTE ON FUNCTIONS FROM sinalytix_app;
  `);
  pgm.sql(`
    ALTER DEFAULT PRIVILEGES FOR ROLE sinalytix IN SCHEMA public
      REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM sinalytix_app;
  `);
  pgm.sql(`REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM sinalytix_app;`);
  pgm.sql(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM sinalytix_app;`);
  pgm.sql(`REVOKE USAGE ON SCHEMA public FROM sinalytix_app;`);
  pgm.sql(`DROP ROLE IF EXISTS sinalytix_app;`);
};
