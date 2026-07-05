/**
 * ApprovalRequest + PatientApprovalConfig — a generic "some sensitive actions
 * need a family approver's sign-off before they take effect" gate (Faz 1
 * Slice 5, last of Faz 1). Two action types are gated initially:
 *   - caregiver_link_change: a CAREGIVER-initiated unlink of a caregiver link
 *     (family oversees who provides care). Requester = caregiver.
 *   - family_link_permission_change: a FAMILY member requesting a higher
 *     permission_level on their OWN link, approved by OTHER active family
 *     members (peer oversight — requester can't approve their own). The exact
 *     product semantics of this second action aren't fully spec'd; this is a
 *     documented judgment call (see DEVIATIONS D14), kept parallel to the
 *     caregiver case so both share one approver model.
 *
 * Approver set for a patient = their ACTIVE family members, minus the
 * requester. No approver-designation column exists yet (any active family
 * member is eligible); a future slice can narrow it.
 *
 * Design follows the D12/D13 lesson: cross-actor WRITES (a caregiver/family
 * requester creating a request the patient owns; an approver deciding it) go
 * through SECURITY DEFINER functions, NOT broad RLS UPDATE/INSERT policies —
 * so neither role gets a general mutation capability on the table. RLS carries
 * only the SELECT policy (patient, requester, and the patient's active family
 * members can read). The functions self-authorize by their params.
 *
 * The deferred action is re-executed on approval by calling the action's own
 * SECURITY DEFINER executor with the requester id stored in action_payload —
 * which works precisely because those executors authorize by param, not by
 * session user, so the approving family member's identity is irrelevant.
 */

exports.shorthands = undefined;

const ACTION_TYPES = "('caregiver_link_change', 'family_link_permission_change')";

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE patient_approval_configs (
      patient_id uuid NOT NULL REFERENCES users(user_id),
      action_type text NOT NULL CHECK (action_type IN ${ACTION_TYPES}),
      requires_approval boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      -- Composite PK, not a bare patient_id: a patient configures each action
      -- type independently (a genuine modeling correction over a 1-row config).
      PRIMARY KEY (patient_id, action_type)
    );
    ALTER TABLE patient_approval_configs ENABLE ROW LEVEL SECURITY;

    -- Patient owns their own config. Approvers/requesters never read it
    -- directly — the gate reads it via a SECURITY DEFINER function below.
    CREATE POLICY patient_approval_configs_owner ON patient_approval_configs FOR ALL USING (
      patient_id = app_acting_user_id()
    ) WITH CHECK (
      patient_id = app_acting_user_id()
    );

    CREATE TABLE approval_requests (
      approval_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id uuid NOT NULL REFERENCES users(user_id),
      action_type text NOT NULL CHECK (action_type IN ${ACTION_TYPES}),
      -- Everything needed to re-execute the action later, on approval. Carries
      -- the original requester id so the deferred executor runs as them.
      action_payload jsonb NOT NULL,
      requested_by uuid NOT NULL REFERENCES users(user_id),
      requested_by_role text NOT NULL CHECK (requested_by_role IN ('patient', 'family', 'caregiver')),
      -- Snapshot of the requester's display name at request time. Denormalized
      -- because the approvals screen renders it to the patient/family approver,
      -- who have no RLS access to the requester's (e.g. caregiver's) profile —
      -- and a name is a point-in-time fact anyway (same provenance-snapshot
      -- reasoning as audit_log_entries). Filled by the gate, which reads it
      -- from the requester's own profile (self-readable) at creation.
      requested_by_name text NOT NULL,
      status text NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'approved', 'rejected', 'expired', 'auto_approved_no_approver')
      ),
      decided_by uuid REFERENCES users(user_id),
      decided_at timestamptz,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

    -- Non-unique lookup index over pending requests. It is deliberately NOT a
    -- UNIQUE index on (patient_id, action_type): a patient can legitimately
    -- have several pending requests of the same action_type at once (e.g. two
    -- different caregivers each with a pending unlink). The real dedup key is
    -- the per-target id inside action_payload (link_id), which a partial
    -- constraint can't index, so exact-duplicate rejection (same target, same
    -- requester, still pending) is enforced in the service before the gate
    -- runs — see CaregiverLinksService.unlink(). This index just keeps the
    -- gate's approver-count / pending-lookup queries cheap.
    CREATE INDEX approval_requests_patient_pending
      ON approval_requests (patient_id, action_type) WHERE status = 'pending';

    -- The patient, the requester, and the patient's active family members
    -- (the eligible approvers) can read. No UPDATE/INSERT policy — writes go
    -- through the SECURITY DEFINER functions below.
    CREATE POLICY approval_requests_select ON approval_requests FOR SELECT USING (
      patient_id = app_acting_user_id()
      OR requested_by = app_acting_user_id()
      OR EXISTS (
        SELECT 1 FROM patient_family_links pfl
        WHERE pfl.patient_id = approval_requests.patient_id
          AND pfl.family_user_id = app_acting_user_id()
          AND pfl.status = 'active'
      )
    );

    -- Reads the patient's config for one action type, bypassing RLS (the
    -- caller is usually the caregiver/family requester, who can't read the
    -- patient-owned config row). Returns false when no config row exists
    -- (default-allow: an unconfigured action isn't gated). Not sensitive — a
    -- boolean policy flag, not PHI.
    CREATE OR REPLACE FUNCTION approval_config_requires_approval(p_patient_id uuid, p_action_type text)
    RETURNS boolean
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT COALESCE(
        (SELECT requires_approval FROM patient_approval_configs
         WHERE patient_id = p_patient_id AND action_type = p_action_type),
        false
      );
    $$;

    -- Counts eligible approvers = the patient's active family members, minus
    -- the requester (a family member can't be the approver of their own
    -- request). Bypasses RLS so the caregiver/family requester can learn
    -- "is there anyone who could approve this?" without reading the links.
    CREATE OR REPLACE FUNCTION approval_count_eligible_approvers(p_patient_id uuid, p_exclude uuid)
    RETURNS integer
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT count(*)::int FROM patient_family_links
      WHERE patient_id = p_patient_id AND status = 'active' AND family_user_id <> p_exclude;
    $$;

    -- Creates a pending approval request the patient owns, on behalf of a
    -- caregiver/family requester (cross-actor write → SECURITY DEFINER, not an
    -- INSERT policy). Args are server-derived. Returns the new approval_id.
    CREATE OR REPLACE FUNCTION approval_request_create(
      p_patient_id uuid, p_action_type text, p_action_payload jsonb,
      p_requested_by uuid, p_requested_by_role text, p_requested_by_name text, p_status text, p_expires_at timestamptz
    )
    RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    DECLARE new_id uuid;
    BEGIN
      INSERT INTO approval_requests (patient_id, action_type, action_payload, requested_by, requested_by_role, requested_by_name,
                                     status, expires_at, decided_at)
      VALUES (p_patient_id, p_action_type, p_action_payload, p_requested_by, p_requested_by_role, p_requested_by_name,
              p_status, p_expires_at, CASE WHEN p_status = 'pending' THEN NULL ELSE now() END)
      RETURNING approval_id INTO new_id;
      RETURN new_id;
    END;
    $$;

    -- Decides (approve/reject) a pending request. Self-authorizes: the decider
    -- must be an ACTIVE family member of the request's patient AND NOT the
    -- original requester (no approving your own request). A non-eligible
    -- decider, a missing request, or an already-decided one → 0 rows (the
    -- service turns that into 403/404/409 as appropriate by re-checking).
    -- Returns the row's action_type/action_payload so the service can execute
    -- the deferred action on approval.
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

exports.down = (pgm) => {
  pgm.sql(`
    DROP FUNCTION IF EXISTS approval_request_decide(uuid, uuid, text);
    DROP FUNCTION IF EXISTS approval_request_create(uuid, text, jsonb, uuid, text, text, text, timestamptz);
    DROP FUNCTION IF EXISTS approval_count_eligible_approvers(uuid, uuid);
    DROP FUNCTION IF EXISTS approval_config_requires_approval(uuid, text);
    DROP TABLE IF EXISTS approval_requests;
    DROP TABLE IF EXISTS patient_approval_configs;
  `);
};
