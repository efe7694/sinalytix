/**
 * FamilyLinkCode — a patient-issued, single-use invite a family member
 * redeems to create a PatientFamilyLink (Faz 1 Slice 3, Dictionary §2/§6).
 * Created before patient_family_links (0012) because that table's redeem
 * INSERT policy references this one (same "declare the dependency first"
 * ordering as sdm_declarations before consent_grants, 0008/0009).
 *
 * Three sources: `code` (6-digit, typed by the family member),
 * `qr` (a separate, higher-entropy payload scanned instead of typed —
 * doesn't share the 6-digit human-typing constraint, so it's a longer
 * opaque token, not just the same 6-digit code), and `ec_invite` (the
 * patient added this person as an EmergencyContact — non-null
 * `emergency_contact_id` implies this source; Slice 2's `invite_status`/
 * `invite_sent_at` fields on emergency_contacts are what this source wires
 * up to).
 *
 * Both the *lookup* (finding which row a given code value belongs to) and
 * the *redeem write* (marking that row redeemed) go through SECURITY
 * DEFINER functions rather than RLS policies — this isn't the usual D7/D10
 * cross-actor-write shape (an explicit RLS policy letting a non-owner
 * write), because of a sharper Postgres RLS behavior found empirically
 * while building this: an UPDATE's row-candidate scan requires the OLD row
 * to satisfy an applicable *SELECT* policy, not just the UPDATE policy's
 * own USING clause (confirmed by testing with the UPDATE policy alone
 * present, USING objectively true, and the UPDATE still silently affecting
 * zero rows — this is documented Postgres behavior, easy to miss: UPDATE
 * needs read access to identify rows, same as an implicit sub-SELECT).
 * Elsewhere in this schema (patient_family_links' INSERT, consent_grants'
 * new INSERT/UPDATE branches, emergency_contacts' new UPDATE branch) this
 * was a non-issue because the acting family member already has a
 * legitimate SELECT branch for other reasons by the time those statements
 * run. Here it's a genuine conflict: granting a SELECT policy wide enough
 * to make an active-but-unredeemed code visible for the UPDATE would also
 * make it visible to a plain SELECT — defeating the anti-enumeration
 * design (any authenticated user could list every active code, `code`/
 * `qr_payload` plaintext included, since Postgres RLS has no column-level
 * granularity). A SECURITY DEFINER function sidesteps the SELECT
 * requirement entirely for the write itself (it runs with the function
 * owner's privileges, the same reason 0003's pre-auth lookups bypass RLS),
 * so this table needs no FOR UPDATE policy. It still needs one narrow
 * non-owner FOR SELECT policy, though — see family_link_codes_redeemer_select
 * below — because patient_family_links' own INSERT policy (0012) proves
 * "this family member really did just redeem a code for this patient" via
 * an EXISTS subquery against this table, and that subquery is a plain
 * SELECT under the family actor's own RLS context, not a SECURITY DEFINER
 * call. That policy is scoped to `redeemed_by = actor`, which never
 * exposes an unredeemed row's `code`/`qr_payload` to anyone — no
 * enumeration risk.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE family_link_codes (
      link_code_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id uuid NOT NULL REFERENCES users(user_id),
      code text NOT NULL,
      qr_payload text NOT NULL,
      source text NOT NULL CHECK (source IN ('code', 'qr', 'ec_invite')),
      emergency_contact_id uuid REFERENCES emergency_contacts(ec_id),
      status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'revoked')),
      expires_at timestamptz NOT NULL,
      redeemed_at timestamptz,
      redeemed_by uuid REFERENCES users(user_id),
      created_at timestamptz NOT NULL DEFAULT now(),

      CONSTRAINT family_link_codes_ec_invite_has_ec CHECK (
        (source = 'ec_invite') = (emergency_contact_id IS NOT NULL)
      )
    );
    ALTER TABLE family_link_codes ENABLE ROW LEVEL SECURITY;

    -- Uniqueness is scoped by *intent*, not just patient:
    --  - A generic 'code'/'qr' invite isn't tied to any one person —
    --    generating a new one replaces the old (mirrors the caregiver-link
    --    UI's existing behavior), so only one may be active at a time.
    --  - An 'ec_invite' targets one specific EmergencyContact row — a
    --    patient inviting 3 different contacts needs 3 simultaneously
    --    active codes, so this is scoped per emergency_contact_id, not
    --    per patient.
    CREATE UNIQUE INDEX family_link_codes_one_active_connect_per_patient
      ON family_link_codes (patient_id) WHERE status = 'active' AND source IN ('code', 'qr');
    CREATE UNIQUE INDEX family_link_codes_one_active_per_ec
      ON family_link_codes (emergency_contact_id) WHERE status = 'active' AND source = 'ec_invite';

    -- Patient can see/manage their own codes (view the active one, revoke it).
    CREATE POLICY family_link_codes_owner ON family_link_codes FOR ALL USING (
      patient_id = app_acting_user_id()
    ) WITH CHECK (
      patient_id = app_acting_user_id()
    );

    -- Still needed even though the redeem *write* itself goes through the
    -- SECURITY DEFINER function below (see header comment) — after that
    -- function runs, patient_family_links' own INSERT policy (migration
    -- 0012) proves the redeem happened via an EXISTS subquery checking
    -- redeemed_by = app_acting_user_id() AND status = 'redeemed' on this
    -- table. That EXISTS is a plain SELECT under the family actor's own
    -- RLS context, not a SECURITY DEFINER call — without this policy it
    -- would find zero rows regardless of the actual data, and the *next*
    -- table's INSERT would fail instead of this one's.
    CREATE POLICY family_link_codes_redeemer_select ON family_link_codes FOR SELECT USING (
      redeemed_by = app_acting_user_id()
    );

    -- Read-only anti-enumeration lookup by code value. Returns nothing on
    -- a wrong guess, an expired code, or an already-redeemed code — the
    -- service layer turns all three into the same generic 404, never
    -- leaking which.
    CREATE OR REPLACE FUNCTION family_link_code_lookup(p_code text)
    RETURNS TABLE(
      link_code_id uuid, patient_id uuid, source text,
      emergency_contact_id uuid, expires_at timestamptz
    )
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT link_code_id, patient_id, source, emergency_contact_id, expires_at
      FROM family_link_codes
      WHERE code = p_code AND status = 'active' AND expires_at > now();
    $$;

    -- Same lookup, keyed by the QR payload instead of the typed code —
    -- kept as a separate function (not an OR'd second parameter) so a QR
    -- scan and a typed code can never accidentally cross-match each other.
    CREATE OR REPLACE FUNCTION family_link_code_lookup_by_qr(p_qr_payload text)
    RETURNS TABLE(
      link_code_id uuid, patient_id uuid, source text,
      emergency_contact_id uuid, expires_at timestamptz
    )
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT link_code_id, patient_id, source, emergency_contact_id, expires_at
      FROM family_link_codes
      WHERE qr_payload = p_qr_payload AND status = 'active' AND expires_at > now();
    $$;

    -- The redeem write itself: atomically transitions exactly one
    -- active, unexpired row to redeemed, stamping who redeemed it and
    -- which method actually matched (code vs qr — a generic connect code
    -- carries both values; whichever the caller used to find it is
    -- recorded here, overwriting the creation-time placeholder). Returns
    -- nothing if the row was concurrently redeemed/revoked/expired between
    -- the caller's lookup and this call (the row-level UPDATE lock plus
    -- the WHERE status='active' re-check makes this race-safe — a second
    -- concurrent caller's UPDATE simply matches zero rows once the first
    -- commits). PL/pgSQL (not plain SQL) because a bare UPDATE...RETURNING
    -- as a SECURITY DEFINER SQL function can't distinguish "zero rows"
    -- from "one row" as a single scalar the way this needs to.
    --
    -- Also joins the invited EmergencyContact's own relationship (NULL for
    -- non-ec_invite sources, or if that contact was removed since the
    -- invite was sent) — deliberately NOT a separate follow-up SELECT from
    -- the service layer: at this point in the redeem sequence the
    -- patient_family_links row doesn't exist yet, so the family actor has
    -- no RLS-granted SELECT visibility into that EC row at all
    -- (emergency_contacts_family_select, migration 0012, requires an
    -- already-active link) — the same "UPDATE/SELECT needs an applicable
    -- SELECT policy" constraint this function's own header comment
    -- describes, just hit one step later in the flow. SECURITY DEFINER
    -- sidesteps it here exactly as it does for the redeem write itself.
    CREATE OR REPLACE FUNCTION family_link_code_redeem(p_link_code_id uuid, p_redeemed_by uuid, p_source text)
    RETURNS TABLE(
      link_code_id uuid, patient_id uuid, source text, emergency_contact_id uuid, ec_relationship text
    )
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    BEGIN
      RETURN QUERY
        UPDATE family_link_codes AS flc
        SET status = 'redeemed', redeemed_at = now(), redeemed_by = p_redeemed_by, source = p_source
        WHERE flc.link_code_id = p_link_code_id AND flc.status = 'active' AND flc.expires_at > now()
        RETURNING
          flc.link_code_id, flc.patient_id, flc.source, flc.emergency_contact_id,
          -- Scalar subquery, not a JOIN — naturally NULL for a non-ec_invite
          -- code (emergency_contact_id IS NULL) or if the invited contact
          -- was removed since the invite was sent; the service layer
          -- distinguishes those two NULL cases itself (it already knows
          -- which source this is).
          (SELECT ec.relationship FROM emergency_contacts ec WHERE ec.ec_id = flc.emergency_contact_id AND ec.deleted_at IS NULL);
    END;
    $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP FUNCTION IF EXISTS family_link_code_redeem(uuid, uuid, text);
    DROP FUNCTION IF EXISTS family_link_code_lookup_by_qr(text);
    DROP FUNCTION IF EXISTS family_link_code_lookup(text);
    DROP TABLE IF EXISTS family_link_codes;
  `);
};
