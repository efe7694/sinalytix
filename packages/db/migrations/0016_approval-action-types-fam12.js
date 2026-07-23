/**
 * Approval action types realigned to FAM-12 — DEVIATIONS.md D15 item A5.
 *
 * Faz 1 Slice 5 shipped the action-type set `{caregiver_link_change,
 * family_link_permission_change}`. Neither the doc set's Modül 1 §9 nor the
 * Family PRD's FAM-12 §3 table contains `family_link_permission_change`; both
 * name the same four:
 *
 *   | Aksiyon                   | Varsayılan     |
 *   | caregiver_link_change     | Onay gerekli   |
 *   | ec_change                 | Onay gerekli   |
 *   | profile_edit              | Onaysız        |
 *   | account_delete            | Bilgilendirme  |
 *
 * D14 already flagged `family_link_permission_change` as a type whose product
 * semantics were never pinned down and which had no trigger endpoint — it was
 * invented, so it goes rather than getting one.
 *
 * The second correction is the DEFAULT. 0014's
 * `approval_config_requires_approval` returned `false` for an unconfigured
 * action ("default-allow"). FAM-12's table is the opposite for the two
 * safety-relevant types: approval is required unless the patient turns it OFF
 * (K4 keeps that toggle patient-owned, PHIPA: a capable patient decides for
 * themselves). Defaulting to "not gated" quietly disabled the family safety
 * net for every patient who never opened the setting — which is the entire
 * population, since nothing prompts them to.
 *
 * Blocking is still impossible: with no `edit`/`full` family approver the
 * gate runs the action immediately and records `auto_approved_no_approver`
 * (K4 deadlock override), so a patient with no family is unaffected.
 */

exports.shorthands = undefined;

// Modül 1 §9 + FAM-12 §3.
const ACTION_TYPES = "('caregiver_link_change', 'ec_change', 'profile_edit', 'account_delete')";

// FAM-12 §3 "Varsayılan: Onay gerekli". `profile_edit` is explicitly
// "Onaysız" and `account_delete` is "Bilgilendirme" (notify, don't gate) —
// so only these two default to on.
const DEFAULT_REQUIRED_TYPES = "('caregiver_link_change', 'ec_change')";

exports.up = (pgm) => {
  // No environment has a `family_link_permission_change` row (it never had a
  // trigger endpoint, so nothing could create one), but the delete is written
  // anyway so the CHECK swap below can't fail on real data.
  pgm.sql(`
    DELETE FROM approval_requests WHERE action_type = 'family_link_permission_change';
    DELETE FROM patient_approval_configs WHERE action_type = 'family_link_permission_change';

    ALTER TABLE patient_approval_configs DROP CONSTRAINT IF EXISTS patient_approval_configs_action_type_check;
    ALTER TABLE patient_approval_configs ADD CONSTRAINT patient_approval_configs_action_type_check
      CHECK (action_type IN ${ACTION_TYPES});

    ALTER TABLE approval_requests DROP CONSTRAINT IF EXISTS approval_requests_action_type_check;
    ALTER TABLE approval_requests ADD CONSTRAINT approval_requests_action_type_check
      CHECK (action_type IN ${ACTION_TYPES});
  `);

  // The default now depends on the action type, so the fallback moves inside
  // the function rather than being a bare `false`. Kept as one SQL function
  // (not application logic) because the gate reads it through SECURITY
  // DEFINER — the requester is usually a caregiver who cannot see the
  // patient-owned config row at all.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION approval_config_requires_approval(p_patient_id uuid, p_action_type text)
    RETURNS boolean
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT COALESCE(
        (SELECT requires_approval FROM patient_approval_configs
         WHERE patient_id = p_patient_id AND action_type = p_action_type),
        p_action_type IN ${DEFAULT_REQUIRED_TYPES}
      );
    $$;
  `);

  // A config row created without an explicit value should also land on the
  // spec default rather than the column's old `false`.
  pgm.sql(`ALTER TABLE patient_approval_configs ALTER COLUMN requires_approval DROP DEFAULT;`);
};

exports.down = (pgm) => {
  pgm.sql(`ALTER TABLE patient_approval_configs ALTER COLUMN requires_approval SET DEFAULT false;`);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION approval_config_requires_approval(p_patient_id uuid, p_action_type text)
    RETURNS boolean
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT COALESCE(
        (SELECT requires_approval FROM patient_approval_configs
         WHERE patient_id = p_patient_id AND action_type = p_action_type),
        false
      );
    $$;
  `);

  pgm.sql(`
    DELETE FROM approval_requests WHERE action_type IN ('ec_change', 'profile_edit', 'account_delete');
    DELETE FROM patient_approval_configs WHERE action_type IN ('ec_change', 'profile_edit', 'account_delete');

    ALTER TABLE patient_approval_configs DROP CONSTRAINT IF EXISTS patient_approval_configs_action_type_check;
    ALTER TABLE patient_approval_configs ADD CONSTRAINT patient_approval_configs_action_type_check
      CHECK (action_type IN ('caregiver_link_change', 'family_link_permission_change'));

    ALTER TABLE approval_requests DROP CONSTRAINT IF EXISTS approval_requests_action_type_check;
    ALTER TABLE approval_requests ADD CONSTRAINT approval_requests_action_type_check
      CHECK (action_type IN ('caregiver_link_change', 'family_link_permission_change'));
  `);
};
