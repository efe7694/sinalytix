/**
 * ConsentRecord — legal/ToS consent, append-only (Dictionary §2, Module 1 §4.1).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE consent_records (
      consent_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(user_id),
      app_context text NOT NULL CHECK (app_context IN ('patient','family','caregiver','hcp')),
      version text NOT NULL,
      recorded_channel text NOT NULL CHECK (recorded_channel IN ('in_app','clinician_recorded','paper')),
      flags jsonb NOT NULL,
      consented_at timestamptz NOT NULL,
      server_recorded_at timestamptz NOT NULL DEFAULT now(),
      ip_hash text
    );
    ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

    CREATE TRIGGER consent_records_immutable
      BEFORE UPDATE OR DELETE ON consent_records
      FOR EACH ROW EXECUTE FUNCTION reject_update_delete();

    CREATE POLICY consent_records_select ON consent_records FOR SELECT USING (
      user_id = app_acting_user_id()
    );

    -- C17a: HCP may record consent on behalf of an app-less patient
    -- (recorded_channel = clinician_recorded); everyone else only for themselves.
    CREATE POLICY consent_records_insert ON consent_records FOR INSERT WITH CHECK (
      user_id = app_acting_user_id()
      OR (recorded_channel = 'clinician_recorded' AND (app_has_role('clinician') OR app_has_role('nurse')))
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS consent_records;`);
};
