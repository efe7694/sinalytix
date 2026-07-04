/**
 * ConsentGrant — runtime, revocable data-sharing grant (Dictionary §2, B2,
 * B5, C13, C16). Distinct from consent_records (0004), the immutable
 * legal/ToS consent. Default-deny: no grant row = no access.
 *
 * INSERT policy covers only the two direct-write paths this slice's API
 * supports (patient granting/revoking their own data; an active SDM acting
 * on the patient's behalf). It deliberately does NOT yet cover the baseline
 * grant PatientFamilyLink activation writes atomically (C13) — that write's
 * acting user is the FAMILY member (redeeming a code) or the PATIENT
 * (confirming a pending link), and legitimizing the family-member-as-actor
 * case requires checking an active patient_family_links row, which doesn't
 * exist until Faz 1 Slice 3. Slice 3 ADDS a third INSERT policy referencing
 * that table once it exists (Module 3 §9.2 expand-contract: additive
 * policies, not a rewrite) — Postgres OR's multiple policies for the same
 * command together, so this isn't a breaking change to what's built here.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE consent_grants (
      grant_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id uuid NOT NULL REFERENCES users(user_id),
      granted_to_kind text NOT NULL CHECK (
        granted_to_kind IN ('practitioner_role','org','family_member','caregiver','system')
      ),
      granted_to_id uuid NOT NULL,
      scope jsonb NOT NULL,
      permission text NOT NULL CHECK (permission IN ('permit','deny')),
      period_start timestamptz,
      period_end timestamptz,
      granted_by uuid NOT NULL REFERENCES users(user_id),
      revoked_at timestamptz,
      revoked_by uuid REFERENCES users(user_id),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE consent_grants ENABLE ROW LEVEL SECURITY;

    -- Patient sees all grants on their own data; a grantee sees only grants
    -- naming them (never another grantee's) — Module 2 §3.2. An active SDM
    -- can also see (not just create/revoke) grants for the patient they
    -- represent — DEVIATIONS.md D7 pattern recurs here: Postgres re-checks
    -- this SELECT policy for the RETURNING clause of both the INSERT and
    -- UPDATE policies below, so without this third branch, an SDM's own
    -- create()/revoke() calls succeed at the WITH CHECK/USING level but then
    -- fail on RETURNING (found by the RLS-business test itself, not
    -- inferred — same class of bug D7 already documents for the users table.
    CREATE POLICY consent_grants_select ON consent_grants FOR SELECT USING (
      patient_id = app_acting_user_id()
      OR granted_to_id = app_acting_user_id()
      OR EXISTS (
        SELECT 1 FROM sdm_declarations sd
        WHERE sd.patient_id = consent_grants.patient_id
          AND sd.sdm_user_id = app_acting_user_id()
          AND sd.active
      )
    );

    CREATE POLICY consent_grants_direct_insert ON consent_grants FOR INSERT WITH CHECK (
      granted_by = app_acting_user_id()
      AND (
        patient_id = app_acting_user_id()
        OR EXISTS (
          SELECT 1 FROM sdm_declarations sd
          WHERE sd.patient_id = consent_grants.patient_id
            AND sd.sdm_user_id = app_acting_user_id()
            AND sd.active
        )
      )
    );

    -- Revoke is a column update (revoked_at/by) — same authors as insert.
    -- Baseline grants written by Slice 3 are still revoked here by the
    -- patient/SDM (Dictionary: "yalnız hasta veya SDM ... iptal eder" — a
    -- family member never revokes their own baseline grant directly, only
    -- via the family-link revoke action, which the patient/SDM calls).
    CREATE POLICY consent_grants_revoke ON consent_grants FOR UPDATE USING (
      patient_id = app_acting_user_id()
      OR EXISTS (
        SELECT 1 FROM sdm_declarations sd
        WHERE sd.patient_id = consent_grants.patient_id
          AND sd.sdm_user_id = app_acting_user_id()
          AND sd.active
      )
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS consent_grants;`);
};
