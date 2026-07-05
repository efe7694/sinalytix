/**
 * CaregiverLink — a patient-issued code a caregiver redeems to pair with the
 * patient (Faz 1 Slice 4, Dictionary §4/C22; LINK_01). Simpler than the
 * family-link fabric (0011/0012): ONE table (the code and the link are the
 * same row — a pending code becomes a linked row on redeem, mirroring the
 * legacy `caregiver_links` model), NO baseline ConsentGrant on redeem
 * (caregiver clinical-data access is a later CareTeam-phase concern, not
 * Faz 1 — logged in DEVIATIONS.md), and no patient-confirm step (redeem
 * links immediately, like the family ec_invite path).
 *
 * Legacy rules preserved (LEGACY_HARVEST.md / caregiver_service.py): 6-char
 * code, uppercased at lookup, 15-min TTL, status pending→linked (or expired/
 * unlinked), `unlinked_by` records patient|caregiver|system, generic
 * anti-enumeration error on any lookup failure.
 *
 * The redeem and unlink WRITES go through SECURITY DEFINER functions, not
 * cross-actor RLS UPDATE policies — the deliberate lesson from Slice 3's C1
 * (DEVIATIONS D12): an RLS UPDATE policy grants a whole-row write to every
 * code path that can reach the table, so a cross-actor write that should
 * only touch a few columns belongs in a SECURITY DEFINER function scoped to
 * exactly those columns. This table therefore has NO caregiver UPDATE
 * policy at all — only the patient-owner FOR ALL and a narrow caregiver
 * FOR SELECT (so the caregiver can see their own links for the roster and
 * to hold a link_id for unlink), which never exposes an unredeemed code.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE caregiver_links (
      link_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id uuid NOT NULL REFERENCES users(user_id),
      caregiver_id uuid REFERENCES users(user_id),
      code text NOT NULL,
      qr_payload text NOT NULL,
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'linked', 'expired', 'unlinked')),
      expires_at timestamptz NOT NULL,
      linked_at timestamptz,
      unlinked_at timestamptz,
      unlinked_by text CHECK (unlinked_by IN ('patient', 'caregiver', 'system')),
      created_at timestamptz NOT NULL DEFAULT now(),

      -- caregiver_id is set exactly once the code is redeemed and stays set
      -- thereafter: present for linked/unlinked, absent for pending/expired
      -- (an unredeemed code that lapses is expired with caregiver_id still null).
      CONSTRAINT caregiver_links_linked_has_caregiver CHECK (
        (status IN ('linked', 'unlinked')) = (caregiver_id IS NOT NULL)
      )
    );
    ALTER TABLE caregiver_links ENABLE ROW LEVEL SECURITY;

    -- One live pending code per patient at a time (generating a new one
    -- expires the old — same "replace" behavior the patient UI already has
    -- for the caregiver code). Keeps the anti-enumeration lookup unambiguous.
    CREATE UNIQUE INDEX caregiver_links_one_pending_per_patient
      ON caregiver_links (patient_id) WHERE status = 'pending';
    -- A caregiver can be linked to a patient at most once at a time.
    CREATE UNIQUE INDEX caregiver_links_one_linked_pair
      ON caregiver_links (patient_id, caregiver_id) WHERE status = 'linked';

    -- Patient owns their codes/links (generate, view, revoke a pending code).
    CREATE POLICY caregiver_links_owner ON caregiver_links FOR ALL USING (
      patient_id = app_acting_user_id()
    ) WITH CHECK (
      patient_id = app_acting_user_id()
    );

    -- The caregiver can read links where they are the caregiver — needed for
    -- their patient roster and to hold a link_id to unlink. Scoped to
    -- caregiver_id = actor, so it never exposes a still-pending (unredeemed)
    -- code's plaintext to a non-owner. NO caregiver UPDATE policy (see header).
    CREATE POLICY caregiver_links_caregiver_select ON caregiver_links FOR SELECT USING (
      caregiver_id = app_acting_user_id()
    );

    -- A caregiver may read the display name of a patient they're actively
    -- linked to (for the redeem success screen + the roster join) — same
    -- additive, active-link-gated shape as patient_profiles_family_select
    -- (0012). Does NOT grant any clinical-data access; just first/last name.
    CREATE POLICY patient_profiles_caregiver_select ON patient_profiles FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM caregiver_links cl
        WHERE cl.patient_id = patient_profiles.user_id
          AND cl.caregiver_id = app_acting_user_id()
          AND cl.status = 'linked'
      )
    );

    -- Anti-enumeration lookup by code (uppercased by the caller, matching the
    -- legacy uppercase-at-lookup rule). Returns nothing on a wrong/expired/
    -- already-redeemed code — the service turns all into one generic 404.
    CREATE OR REPLACE FUNCTION caregiver_link_lookup(p_code text)
    RETURNS TABLE(link_id uuid, patient_id uuid, expires_at timestamptz)
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT link_id, patient_id, expires_at
      FROM caregiver_links
      WHERE code = upper(p_code) AND status = 'pending' AND expires_at > now();
    $$;

    CREATE OR REPLACE FUNCTION caregiver_link_lookup_by_qr(p_qr_payload text)
    RETURNS TABLE(link_id uuid, patient_id uuid, expires_at timestamptz)
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT link_id, patient_id, expires_at
      FROM caregiver_links
      WHERE qr_payload = p_qr_payload AND status = 'pending' AND expires_at > now();
    $$;

    -- Redeem: atomically transitions one pending, unexpired code to linked,
    -- stamping the caregiver. Cross-actor write via SECURITY DEFINER (the
    -- caregiver has no UPDATE policy). Returns nothing on a concurrent
    -- redeem/expiry (row-lock + status re-check serialize). Args are always
    -- server-derived (link_id from the looked-up code, caregiver_id from the
    -- JWT), never client input.
    CREATE OR REPLACE FUNCTION caregiver_link_redeem(p_link_id uuid, p_caregiver_id uuid)
    RETURNS TABLE(link_id uuid, patient_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    BEGIN
      RETURN QUERY
        UPDATE caregiver_links AS cl
        SET caregiver_id = p_caregiver_id, status = 'linked', linked_at = now()
        WHERE cl.link_id = p_link_id AND cl.status = 'pending' AND cl.expires_at > now()
        RETURNING cl.link_id, cl.patient_id;
    END;
    $$;

    -- Unlink: either party (patient or caregiver) ends an active link. Also
    -- a SECURITY DEFINER function (rather than a patient-owner UPDATE + a
    -- separate broad caregiver UPDATE policy) so the caregiver never gets a
    -- general UPDATE capability on the table — it self-authorizes by
    -- requiring p_actor to BE one of the two parties, and stamps who did it.
    -- Returns the link_id if it actually unlinked something (the service
    -- 404s otherwise — not a party, or already unlinked).
    CREATE OR REPLACE FUNCTION caregiver_link_unlink(p_link_id uuid, p_actor uuid)
    RETURNS TABLE(link_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    BEGIN
      RETURN QUERY
        UPDATE caregiver_links AS cl
        SET status = 'unlinked',
            unlinked_at = now(),
            unlinked_by = CASE WHEN cl.patient_id = p_actor THEN 'patient' ELSE 'caregiver' END
        WHERE cl.link_id = p_link_id
          AND cl.status = 'linked'
          AND (cl.patient_id = p_actor OR cl.caregiver_id = p_actor)
        RETURNING cl.link_id;
    END;
    $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP POLICY IF EXISTS patient_profiles_caregiver_select ON patient_profiles;
    DROP FUNCTION IF EXISTS caregiver_link_unlink(uuid, uuid);
    DROP FUNCTION IF EXISTS caregiver_link_redeem(uuid, uuid);
    DROP FUNCTION IF EXISTS caregiver_link_lookup_by_qr(text);
    DROP FUNCTION IF EXISTS caregiver_link_lookup(text);
    DROP TABLE IF EXISTS caregiver_links;
  `);
};
