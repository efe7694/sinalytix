/**
 * EmergencyContact — patient-owned, sort_order 1-3 drives SOS/standard call
 * routing priority (Dictionary §4, C20/C21/C23). Patient-only actor this
 * slice (unlike consent_grants, no SDM-on-behalf-of case here — EC
 * management isn't in the SDM's delegated scope per the app PRDs) so a
 * single FOR ALL policy covers read+write with no D7/D10-style RETURNING
 * gap: the owner is always the only actor.
 *
 * `sort_order` is nullable (not `NOT NULL`) specifically so reorder can be
 * atomic: a real DEFERRABLE UNIQUE constraint is what makes a multi-row
 * "swap ranks" UPDATE safe — Postgres checks a plain (non-deferrable) unique
 * index's collision *per row as each row is touched within a statement*,
 * not once at statement end as might be assumed, so a same-statement swap
 * of two rows' sort_order still trips it without deferral (found by the
 * reorder test itself, not anticipated). But DEFERRABLE constraints can't
 * have a partial `WHERE` clause, and this table also needs partial
 * uniqueness (excluding soft-deleted rows, so a freed slot/phone can be
 * reused) — the two requirements can't be satisfied by one Postgres object.
 * Resolution: soft-delete sets `sort_order = NULL` (not just `deleted_at`) —
 * a plain UNIQUE constraint already treats multiple NULLs as non-colliding,
 * so deleted rows never need a partial-WHERE carve-out for this column, and
 * the constraint can be a normal DEFERRABLE one. `phone`'s own uniqueness
 * has no swap/atomicity need, so it stays a simple partial index.
 *
 * Family read-access (once a link exists) is added by Faz 1 Slice 3 as an
 * additive SELECT policy once patient_family_links exists — not here, to
 * avoid forward-referencing a table that doesn't exist yet (same pattern
 * as consent_grants' deferred third INSERT branch, D10).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE emergency_contacts (
      ec_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id uuid NOT NULL REFERENCES users(user_id),
      relationship text NOT NULL,
      first_name text NOT NULL,
      last_name text NOT NULL,
      phone text NOT NULL,
      phone_verified boolean NOT NULL DEFAULT false,
      sort_order int CHECK (sort_order IS NULL OR sort_order BETWEEN 1 AND 3),
      invite_status text NOT NULL DEFAULT 'pending' CHECK (
        invite_status IN ('pending','accepted_app_user','accepted_phone_only')
      ),
      invite_sent_at timestamptz,
      invite_accepted_at timestamptz,
      linked_family_user_id uuid REFERENCES users(user_id),
      created_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
    ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

    ALTER TABLE emergency_contacts
      ADD CONSTRAINT emergency_contacts_patient_sort_uq
      UNIQUE (patient_id, sort_order) DEFERRABLE INITIALLY DEFERRED;

    CREATE UNIQUE INDEX emergency_contacts_patient_phone_uq
      ON emergency_contacts (patient_id, phone) WHERE deleted_at IS NULL;

    CREATE POLICY emergency_contacts_owner ON emergency_contacts FOR ALL USING (
      patient_id = app_acting_user_id()
    ) WITH CHECK (
      patient_id = app_acting_user_id()
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS emergency_contacts;`);
};
