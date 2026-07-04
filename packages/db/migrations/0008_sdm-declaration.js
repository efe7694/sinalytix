/**
 * SDMDeclaration — substitute decision-maker (Dictionary §2, Module 1 §4.3).
 * ON HCCA hierarchy only for V0/MVP (province_rule); BC/QC/AB V2.
 *
 * Created before consent_grants (0009) because that table's INSERT policy
 * references this one — an active SDM may grant on a patient's behalf.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE sdm_declarations (
      sdm_declaration_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id uuid NOT NULL REFERENCES users(user_id),
      sdm_user_id uuid NOT NULL REFERENCES users(user_id),
      province_rule text NOT NULL DEFAULT 'ON_HCCA' CHECK (province_rule IN ('ON_HCCA')),
      -- References a future DocumentReference table (Module 1 §5.8), not
      -- migrated yet — same expand-contract pattern as practitioner_roles'
      -- license_record_id (0002). FK constraint added once Documents lands.
      poa_document_id uuid,
      active boolean NOT NULL DEFAULT false,
      activated_by uuid REFERENCES users(user_id),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE sdm_declarations ENABLE ROW LEVEL SECURITY;

    CREATE UNIQUE INDEX sdm_declarations_patient_sdm_uq ON sdm_declarations (patient_id, sdm_user_id);

    -- Patient, the declared SDM, and clinicians/nurses (who create/manage
    -- these per C17a-style capacity assessment) can all see a declaration.
    CREATE POLICY sdm_declarations_select ON sdm_declarations FOR SELECT USING (
      patient_id = app_acting_user_id()
      OR sdm_user_id = app_acting_user_id()
      OR app_has_role('clinician')
      OR app_has_role('nurse')
    );

    -- Only HCP creates/activates an SDM declaration (Module 2 §3.2's SDM
    -- endpoint is X-App-Context: hcp only) — capacity assessment is a
    -- clinical act, not something a patient or family member self-declares.
    CREATE POLICY sdm_declarations_hcp_insert ON sdm_declarations FOR INSERT WITH CHECK (
      app_has_role('clinician') OR app_has_role('nurse')
    );
    CREATE POLICY sdm_declarations_hcp_update ON sdm_declarations FOR UPDATE USING (
      app_has_role('clinician') OR app_has_role('nurse')
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS sdm_declarations;`);
};
