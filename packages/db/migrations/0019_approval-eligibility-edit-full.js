/**
 * Restrict approval eligibility to edit/full family members — FAM-12 §2.3 +
 * K4. Independent review finding (HIGH), DEVIATIONS D15.4 correction.
 *
 * FAM-12 is explicit twice: "Onaylama / reddetme aksiyonu yalnızca `full`
 * veya `edit` yetki seviyesindeki aile üyesi tarafından gerçekleştirilebilir"
 * (§2.3), and the K4 deadlock override fires precisely when "the only linked
 * family member is `view` (no edit/full approver)" — that case must run the
 * action immediately as `auto_approved_no_approver`, never sit pending.
 *
 * The 0014 functions counted / authorized ANY active family member, with no
 * `permission_level` filter. That was inert while the approval gate defaulted
 * OFF, but Faz 1.5 Slice 4 flipped the default ON for `caregiver_link_change`
 * and `ec_change` (migration 0016), which turned the gap into two live,
 * population-wide defects:
 *
 *   (A) A patient whose only family is `view`-level now has their own EC
 *       edit / caregiver unlink DEFERRED to `pending` instead of running.
 *       The view member's UI hides "approve" (spec forbids them deciding), so
 *       the request expires unactioned — the exact deadlock K4 says is
 *       impossible. Slice 4's own comments and DEVIATIONS D15.4 claimed an
 *       edit/full override existed; it did not (the cited test used ZERO
 *       family, not a view-only member).
 *   (B) A `view`-level family member could approve via a direct API call,
 *       carrying out a caregiver unlink or EC change — the substitute-decision
 *       authority K6/FAM-13 withholds from non-edit/full members.
 *
 * A new migration (not an edit to 0014) because 0014 has already run
 * everywhere (Mühendislik El Kitabı §4). `CREATE OR REPLACE FUNCTION` keeps
 * the signatures, so no caller changes.
 */

exports.shorthands = undefined;

const ELIGIBLE_LEVELS = "('edit', 'full')";

exports.up = (pgm) => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION approval_count_eligible_approvers(p_patient_id uuid, p_exclude uuid)
    RETURNS integer
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT count(*)::int FROM patient_family_links
      WHERE patient_id = p_patient_id
        AND status = 'active'
        AND permission_level IN ${ELIGIBLE_LEVELS}
        AND family_user_id <> p_exclude;
    $$;
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION approval_request_decide(p_approval_id uuid, p_decider uuid, p_decision text)
    RETURNS TABLE(approval_id uuid, action_type text, action_payload jsonb, patient_id uuid, requested_by uuid)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    BEGIN
      RETURN QUERY
        UPDATE approval_requests AS ar
        SET status = p_decision, decided_by = p_decider, decided_at = now()
        WHERE ar.approval_id = p_approval_id
          AND ar.status = 'pending'
          AND ar.expires_at > now()
          AND ar.requested_by <> p_decider
          AND EXISTS (
            SELECT 1 FROM patient_family_links pfl
            WHERE pfl.patient_id = ar.patient_id
              AND pfl.family_user_id = p_decider
              AND pfl.status = 'active'
              AND pfl.permission_level IN ${ELIGIBLE_LEVELS}
          )
        RETURNING ar.approval_id, ar.action_type, ar.action_payload, ar.patient_id, ar.requested_by;
    END;
    $$;
  `);
};

exports.down = (pgm) => {
  // Restore the 0014 (unfiltered) definitions.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION approval_count_eligible_approvers(p_patient_id uuid, p_exclude uuid)
    RETURNS integer
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT count(*)::int FROM patient_family_links
      WHERE patient_id = p_patient_id AND status = 'active' AND family_user_id <> p_exclude;
    $$;
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION approval_request_decide(p_approval_id uuid, p_decider uuid, p_decision text)
    RETURNS TABLE(approval_id uuid, action_type text, action_payload jsonb, patient_id uuid, requested_by uuid)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    BEGIN
      RETURN QUERY
        UPDATE approval_requests AS ar
        SET status = p_decision, decided_by = p_decider, decided_at = now()
        WHERE ar.approval_id = p_approval_id
          AND ar.status = 'pending'
          AND ar.expires_at > now()
          AND ar.requested_by <> p_decider
          AND EXISTS (
            SELECT 1 FROM patient_family_links pfl
            WHERE pfl.patient_id = ar.patient_id
              AND pfl.family_user_id = p_decider
              AND pfl.status = 'active'
          )
        RETURNING ar.approval_id, ar.action_type, ar.action_payload, ar.patient_id, ar.requested_by;
    END;
    $$;
  `);
};
