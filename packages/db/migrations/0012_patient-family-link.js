/**
 * PatientFamilyLink — the actual family↔patient relationship a redeemed
 * FamilyLinkCode (0011) produces (Faz 1 Slice 3, Dictionary §2/§6).
 *
 * Two ways a link reaches `active`:
 *  - `ec_invite` source: redeem() activates immediately (the patient
 *    already named this exact person as an EmergencyContact — that's
 *    itself the authorization).
 *  - `code`/`qr` source: redeem() only reaches `pending_patient_confirm`;
 *    the patient's own confirm() call activates it. (The state name says
 *    who confirms — a `code`/`qr` code proves *a* person knows the code,
 *    not *which* person the patient meant to invite, so the patient gets
 *    a final say before any baseline ConsentGrant is created.)
 *
 * `source`/`emergency_contact_id` are copied from the redeemed code at
 * link-creation time rather than joined live — a historical fact about how
 * this specific link was established, consistent with the rest of this
 * schema snapshotting provenance at write time (e.g. audit_log_entries)
 * rather than leaving it to erode if the originating code row is ever
 * pruned by a future retention job.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE patient_family_links (
      link_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id uuid NOT NULL REFERENCES users(user_id),
      family_user_id uuid NOT NULL REFERENCES users(user_id),
      relationship text NOT NULL,
      status text NOT NULL CHECK (status IN ('pending_patient_confirm', 'active', 'revoked')),
      -- Coarse "how much" access tier, orthogonal to the baseline
      -- ConsentGrant's "which categories" scope array (Dictionary §4,
      -- C13/C22's LinkPermissionLevel) — e.g. a family member might see
      -- medications+labs (scope) at 'view' only (this column), not 'edit'.
      -- Faz 1 Slice 5 gates *changes* to this column
      -- (family_link_permission_change); this slice only sets the initial
      -- default on creation.
      permission_level text NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'edit', 'full')),
      source text NOT NULL CHECK (source IN ('code', 'qr', 'ec_invite')),
      emergency_contact_id uuid REFERENCES emergency_contacts(ec_id),
      baseline_grant_id uuid REFERENCES consent_grants(grant_id),
      linked_at timestamptz,
      revoked_at timestamptz,
      revoked_by uuid REFERENCES users(user_id),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE patient_family_links ENABLE ROW LEVEL SECURITY;

    -- One non-revoked relationship per (patient, family member) pair — a
    -- second redeem attempt while one is already pending/active is a
    -- conflict, not a second row.
    CREATE UNIQUE INDEX patient_family_links_active_pair_uq
      ON patient_family_links (patient_id, family_user_id) WHERE status != 'revoked';

    -- Both sides of the relationship can always see it.
    CREATE POLICY patient_family_links_select ON patient_family_links FOR SELECT USING (
      patient_id = app_acting_user_id() OR family_user_id = app_acting_user_id()
    );

    -- The redeeming family member creates the row — but only for a patient
    -- they've *already* proven knowledge of a valid code for (the
    -- family_link_codes UPDATE, 0011, must happen first in the same
    -- transaction; this EXISTS is what makes that ordering load-bearing,
    -- not optional). Same cross-actor-write shape as consent_grants'
    -- SDM-on-behalf-of-patient INSERT policy (0009) — a provable
    -- relationship established earlier in the same transaction, not a
    -- role check.
    CREATE POLICY patient_family_links_redeem_insert ON patient_family_links FOR INSERT WITH CHECK (
      family_user_id = app_acting_user_id()
      AND EXISTS (
        SELECT 1 FROM family_link_codes flc
        WHERE flc.patient_id = patient_family_links.patient_id
          AND flc.redeemed_by = app_acting_user_id()
          AND flc.status = 'redeemed'
      )
    );

    -- Broad by row (either side can update their shared link) — the
    -- service layer enforces which *transitions* each side may actually
    -- make (e.g. only the patient moves pending_patient_confirm→active;
    -- either side can revoke). Same "RLS gates row ownership, the service
    -- enforces field-level rules" split used throughout this schema (e.g.
    -- consent_grants' revoke()).
    CREATE POLICY patient_family_links_update ON patient_family_links FOR UPDATE USING (
      patient_id = app_acting_user_id() OR family_user_id = app_acting_user_id()
    ) WITH CHECK (
      patient_id = app_acting_user_id() OR family_user_id = app_acting_user_id()
    );

    -- Deferred from 0010 (that migration's header comment flags this
    -- exact addition) — once a link exists, the family member can read
    -- the patient's emergency contacts (e.g. to see who else is in the
    -- patient's care circle), not just the one EC row that may have
    -- invited them.
    CREATE POLICY emergency_contacts_family_select ON emergency_contacts FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM patient_family_links pfl
        WHERE pfl.patient_id = emergency_contacts.patient_id
          AND pfl.family_user_id = app_acting_user_id()
          AND pfl.status = 'active'
      )
    );

    -- The redeem() transaction for an ec_invite-sourced code runs entirely
    -- as the family member (app_acting_user_id() never switches to the
    -- patient mid-transaction — see 0009's own header comment, which
    -- anticipated exactly this policy) — so accepting the invite (stamping
    -- linked_family_user_id/invite_status back onto the ONE EC row that
    -- generated this exact invite) needs its own cross-actor UPDATE
    -- policy, scoped tightly to that single row via the link's own
    -- emergency_contact_id FK, not "any EC row for this patient".
    CREATE POLICY emergency_contacts_family_invite_accept ON emergency_contacts FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM patient_family_links pfl
        WHERE pfl.emergency_contact_id = emergency_contacts.ec_id
          AND pfl.family_user_id = app_acting_user_id()
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM patient_family_links pfl
        WHERE pfl.emergency_contact_id = emergency_contacts.ec_id
          AND pfl.family_user_id = app_acting_user_id()
      )
    );

    -- Third INSERT branch anticipated by 0009's own header comment and by
    -- ConsentGrantsService.createBaseline()'s doc comment: the ec_invite
    -- redeem path runs entirely as the family member, so the baseline
    -- grant insert needs a branch that doesn't require
    -- granted_by = app_acting_user_id() (the original two branches' shared
    -- shape) — here granted_by is the PATIENT (the true authorizer: adding
    -- someone as an EmergencyContact with instant-activation IS the
    -- patient's own act of consent, the family member is just the
    -- mechanical actor executing an already-authorized redeem), while
    -- granted_to_id is the family member actually receiving the grant.
    CREATE POLICY consent_grants_family_link_insert ON consent_grants FOR INSERT WITH CHECK (
      granted_to_kind = 'family_member'
      AND granted_to_id = app_acting_user_id()
      AND granted_by = patient_id
      AND EXISTS (
        SELECT 1 FROM patient_family_links pfl
        WHERE pfl.patient_id = consent_grants.patient_id
          AND pfl.family_user_id = app_acting_user_id()
          AND pfl.status = 'active'
      )
    );

    -- listMyLinks() joins patient_profiles to render each linked patient's
    -- display name — patient_profiles_self (0002) is patient-only, so
    -- without this, that join would silently return zero rows for a
    -- family member (RLS filters the joined side too, no error) rather
    -- than erroring loudly. Same pattern as emergency_contacts_family_select.
    CREATE POLICY patient_profiles_family_select ON patient_profiles FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM patient_family_links pfl
        WHERE pfl.patient_id = patient_profiles.user_id
          AND pfl.family_user_id = app_acting_user_id()
          AND pfl.status = 'active'
      )
    );

    -- A family member may revoke a grant naming them (self-unlink cascades
    -- the baseline grant's revoke while still acting as the family member,
    -- not the patient) — safe by construction: this only ever lets someone
    -- relinquish access they themselves hold, never touch another party's
    -- grant. 0009's consent_grants_revoke policy deliberately excludes
    -- this case ("a family member never revokes their own baseline grant
    -- directly, only via the family-link revoke action") — this is that
    -- action, added here as its own policy rather than editing 0009 (an
    -- already-applied migration), consistent with Module 3 §9.2's
    -- expand-contract philosophy.
    CREATE POLICY consent_grants_family_grantee_revoke ON consent_grants FOR UPDATE USING (
      granted_to_kind = 'family_member' AND granted_to_id = app_acting_user_id()
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    -- Policy expressions referencing patient_family_links aren't tracked as
    -- formal dependencies by Postgres (unlike a FK) — dropping the table
    -- first would leave these dangling, not auto-removed, so they must go
    -- explicitly before the table does.
    DROP POLICY IF EXISTS consent_grants_family_grantee_revoke ON consent_grants;
    DROP POLICY IF EXISTS consent_grants_family_link_insert ON consent_grants;
    DROP POLICY IF EXISTS patient_profiles_family_select ON patient_profiles;
    DROP POLICY IF EXISTS emergency_contacts_family_invite_accept ON emergency_contacts;
    DROP POLICY IF EXISTS emergency_contacts_family_select ON emergency_contacts;
    DROP TABLE IF EXISTS patient_family_links;
  `);
};
