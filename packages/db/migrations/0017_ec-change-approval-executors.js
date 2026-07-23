/**
 * Deferred executors for `ec_change` approvals — FAM-12 §3, DEVIATIONS D15.4b.
 *
 * FAM-12 defaults emergency-contact changes to "onay gerekli": the patient
 * asks, an active family member approves, and only THEN does the change take
 * effect. Which means the write happens in a request whose session belongs to
 * the *approver*, not the patient who owns the row.
 *
 * **This is the exact shape of Slice 3's Critical (D12).** Back then, letting
 * a family member write an emergency contact was done with an RLS UPDATE
 * policy, and because Postgres RLS has no column-level `WITH CHECK`, that
 * policy silently unlocked the general-purpose `PATCH /emergency-contacts/:id`
 * edit path and the soft-delete for any linked family member — a cross-tenant
 * write to the phone number the SOS chain dials. So these are SECURITY
 * DEFINER functions scoped to exactly the columns each action touches, and
 * `emergency_contacts` gains NO new policy at all.
 *
 * Each function authorizes on `p_patient_id`, which the caller takes from
 * `approval_requests.patient_id` — a column only the patient's own gated
 * request can set — never from the approver's session and never from the
 * (client-influenced) action payload.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // CREATE. `p_sort_order` is resolved by the caller at approval time, not at
  // request time: between asking and approving, the patient may have removed
  // another contact, so the slot that was free 40 hours ago may not be the
  // one that is free now (and vice versa).
  pgm.sql(`
    CREATE OR REPLACE FUNCTION ec_apply_create(
      p_patient_id uuid,
      p_relationship text,
      p_first_name text,
      p_last_name text,
      p_phone text,
      p_sort_order int
    ) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    DECLARE
      v_ec_id uuid;
      v_active_count int;
    BEGIN
      -- Re-check the max-3 rule here as well: it was checked when the request
      -- was raised, but 48 hours of approval window is plenty of time for the
      -- patient to have added contacts through an ungated path.
      SELECT count(*) INTO v_active_count
        FROM emergency_contacts
        WHERE patient_id = p_patient_id AND deleted_at IS NULL;
      IF v_active_count >= 3 THEN
        RAISE EXCEPTION 'ec_apply_create: patient already has the maximum number of emergency contacts';
      END IF;

      INSERT INTO emergency_contacts (patient_id, relationship, first_name, last_name, phone, sort_order)
      VALUES (p_patient_id, p_relationship, p_first_name, p_last_name, p_phone, p_sort_order)
      RETURNING ec_id INTO v_ec_id;
      RETURN v_ec_id;
    END;
    $$;
  `);

  // UPDATE — only the four mutable descriptive columns. Notably NOT
  // `phone_verified`: changing the phone must never carry the old number's
  // verified status forward, so the caller sets it false in the same call
  // via p_phone being non-null.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION ec_apply_update(
      p_ec_id uuid,
      p_patient_id uuid,
      p_relationship text,
      p_first_name text,
      p_last_name text,
      p_phone text
    ) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      WITH updated AS (
        UPDATE emergency_contacts SET
          relationship = COALESCE(p_relationship, relationship),
          first_name   = COALESCE(p_first_name, first_name),
          last_name    = COALESCE(p_last_name, last_name),
          phone        = COALESCE(p_phone, phone),
          phone_verified = CASE WHEN p_phone IS NOT NULL AND p_phone <> phone THEN false ELSE phone_verified END
        WHERE ec_id = p_ec_id
          AND patient_id = p_patient_id
          AND deleted_at IS NULL
        RETURNING 1
      )
      SELECT EXISTS (SELECT 1 FROM updated);
    $$;
  `);

  // REMOVE. `sort_order = NULL` frees the 1-3 slot for the DEFERRABLE unique
  // constraint (migration 0010) — NULLs never collide.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION ec_apply_remove(p_ec_id uuid, p_patient_id uuid)
    RETURNS boolean
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      WITH removed AS (
        UPDATE emergency_contacts
        SET deleted_at = now(), sort_order = NULL
        WHERE ec_id = p_ec_id
          AND patient_id = p_patient_id
          AND deleted_at IS NULL
        RETURNING 1
      )
      SELECT EXISTS (SELECT 1 FROM removed);
    $$;
  `);

  // Lowest free 1-3 slot for a patient — the same rule the service applies
  // inline, expressed once so the deferred path can't drift from it.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION ec_next_sort_order(p_patient_id uuid)
    RETURNS int
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT MIN(s) FROM generate_series(1, 3) AS s
      WHERE s NOT IN (
        SELECT sort_order FROM emergency_contacts
        WHERE patient_id = p_patient_id AND deleted_at IS NULL AND sort_order IS NOT NULL
      );
    $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP FUNCTION IF EXISTS ec_next_sort_order(uuid);
    DROP FUNCTION IF EXISTS ec_apply_remove(uuid, uuid);
    DROP FUNCTION IF EXISTS ec_apply_update(uuid, uuid, text, text, text, text);
    DROP FUNCTION IF EXISTS ec_apply_create(uuid, text, text, text, text, int);
  `);
};
