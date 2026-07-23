/**
 * CareTask + CareTaskOccurrence + ActivityLog — Faz 2 Slice 1.
 * Sözlük §3, Modül 1 §6, Modül 3 §5 (K7), Hasta PRD §4.
 *
 * This is the object every surface revolves around: the patient's daily care
 * actions. Four apps read it, five actor types can write it, and one rule
 * (B1) is the single most-cited constraint in the whole doc set.
 *
 * ## Two tables, not three
 * `CareTask` is the DEFINITION ("metformin, every morning"); an occurrence is
 * ONE DAY of it. Completion happens on the occurrence, never the task —
 * Sözlükçe is explicit: "occurrence tamamlanır, task tamamlanmaz". The old
 * `TaskSchedule` entity is gone; its fields live in `care_tasks.schedule`
 * (jsonb) per the Hasta PRD's A1 reconciliation.
 *
 * ## B1 is enforced at THREE layers, and the DB is the last one
 * "Aile görevi tamamlayamaz" (B1) is checked in PolicyEngine, again in the
 * service, and finally here: `occurrence_complete()` refuses a family actor
 * outright, and `completed_by_actor_type` has a CHECK that does not even
 * include `family`. A rule cited this often will eventually be reached by a
 * code path nobody reviewed; the DB is where it stops being negotiable.
 *
 * ## Cross-actor writes are SECURITY DEFINER (D12/D13/D14)
 * A family member creating a task, or a caregiver completing an occurrence,
 * writes a row the PATIENT owns. The established lesson is that a broad RLS
 * UPDATE policy authorizes a whole-row write for EVERY code path reaching the
 * table — so those writes go through functions scoped to exactly the columns
 * they touch, and `care_task_occurrences` gets NO family/caregiver UPDATE
 * policy at all.
 */

exports.shorthands = undefined;

// Sözlük §3. `family` is deliberately ABSENT from the completion actor set.
const TASK_TYPES = "('one_time', 'recurring', 'counter')";
const TASK_SUBTYPES = "('standard', 'medication')";
const TASK_STATUSES = "('active', 'paused', 'completed', 'cancelled')";
const CREATOR_ACTORS = "('patient', 'caregiver', 'family', 'clinician', 'system', 'agent')";
const COMPLETION_ACTORS = "('patient', 'caregiver', 'system', 'agent')"; // B1: no 'family'
const PROVENANCE = "('manual', 'caregiver', 'family', 'integrated', 'agent')";
const OCCURRENCE_STATUSES = "('todo', 'done', 'skipped')";
const ACTIVITY_ACTIONS =
  "('created', 'edited', 'deleted', 'completed', 'undone', 'skipped', 'unskipped', 'carried_over')";

exports.up = (pgm) => {
  // ── care_tasks ─────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE care_tasks (
      task_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id uuid NOT NULL REFERENCES users(user_id),
      -- Agent sub-task hierarchy (Sözlük §3). Nothing writes it before Faz 6;
      -- it exists now because retrofitting a self-FK onto a live table with
      -- occurrences hanging off it is far worse than carrying a null column.
      parent_task_id uuid REFERENCES care_tasks(task_id),
      -- Faz 5 (CarePlan) links a task back to the clinical plan that spawned
      -- it. Plain uuid, not a FK: care_plans doesn't exist yet, and a FK to a
      -- future table can't be declared now without blocking this migration.
      care_plan_id uuid,
      goal_id uuid,
      title text NOT NULL CHECK (length(trim(title)) > 0),
      type text NOT NULL CHECK (type IN ${TASK_TYPES}),
      subtype text NOT NULL DEFAULT 'standard' CHECK (subtype IN ${TASK_SUBTYPES}),
      -- jsonb, shape depends on type (Hasta PRD §4 "TaskSchedule"):
      --   one_time  → { due_date_local, due_time_local? }
      --   recurring → { frequency: daily|weekly, days_of_week?[], time_of_day_local? }
      --   counter   → { target_per_day, reset_rule: daily, time_of_day_local? }
      -- Validated in @sinalytix/domain (zod) rather than by a CHECK: the
      -- shape is a discriminated union, which SQL expresses badly and which
      -- the API must reject with a field-level 422 anyway.
      schedule jsonb NOT NULL DEFAULT '{}',
      created_by uuid NOT NULL REFERENCES users(user_id),
      created_by_actor_type text NOT NULL CHECK (created_by_actor_type IN ${CREATOR_ACTORS}),
      source_provenance text NOT NULL DEFAULT 'manual' CHECK (source_provenance IN ${PROVENANCE}),
      status text NOT NULL DEFAULT 'active' CHECK (status IN ${TASK_STATUSES}),
      -- Optimistic-lock counter (Modül 2 §3.3: If-Match, mandatory on the
      -- medication subtype). Bumped by every UPDATE via a trigger, so a
      -- caller can never forget to advance it.
      version integer NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
    ALTER TABLE care_tasks ENABLE ROW LEVEL SECURITY;

    CREATE INDEX care_tasks_patient_active_idx
      ON care_tasks (patient_id) WHERE deleted_at IS NULL AND status = 'active';
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION bump_care_task_version() RETURNS trigger AS $$
    BEGIN
      NEW.version := OLD.version + 1;
      NEW.updated_at := now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER care_tasks_version_bump
      BEFORE UPDATE ON care_tasks
      FOR EACH ROW EXECUTE FUNCTION bump_care_task_version();
  `);

  // The patient owns their tasks outright. Family and caregivers READ only —
  // their writes go through the SECURITY DEFINER functions below, so there is
  // no policy here that a future general-purpose edit path could inherit.
  pgm.sql(`
    CREATE POLICY care_tasks_owner ON care_tasks FOR ALL
      USING (patient_id = app_acting_user_id())
      WITH CHECK (patient_id = app_acting_user_id());

    CREATE POLICY care_tasks_family_select ON care_tasks FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM patient_family_links pfl
        WHERE pfl.patient_id = care_tasks.patient_id
          AND pfl.family_user_id = app_acting_user_id()
          AND pfl.status = 'active'
      )
    );

    CREATE POLICY care_tasks_caregiver_select ON care_tasks FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM caregiver_links cl
        WHERE cl.patient_id = care_tasks.patient_id
          AND cl.caregiver_id = app_acting_user_id()
          AND cl.status = 'linked'
      )
    );
  `);

  // ── care_task_occurrences ──────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE care_task_occurrences (
      occurrence_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id uuid NOT NULL REFERENCES care_tasks(task_id),
      -- Denormalized from the task for RLS and for the "today" query, which
      -- is the hottest read in the product (Modül 1 §6.2).
      patient_id uuid NOT NULL REFERENCES users(user_id),
      -- A calendar date in the PATIENT's timezone, not a timestamptz: "did
      -- you take your morning pill on the 3rd" is a question about the
      -- patient's local day, and a UTC instant answers it wrong twice a year.
      date_local date NOT NULL,
      time_local time,
      status text NOT NULL DEFAULT 'todo' CHECK (status IN ${OCCURRENCE_STATUSES}),
      -- Counter progress (Hasta PRD: 0..target_per_day). Null for non-counter.
      progress_count integer,
      completed_at timestamptz,
      completed_by uuid REFERENCES users(user_id),
      completed_by_actor_type text CHECK (completed_by_actor_type IN ${COMPLETION_ACTORS}),
      skipped_at timestamptz,
      skipped_by uuid REFERENCES users(user_id),
      -- Chain link for "move to tomorrow" (Modül 3 §5). The ORIGINAL row is
      -- never mutated — carry-over creates a NEW occurrence pointing back.
      carry_over_from uuid REFERENCES care_task_occurrences(occurrence_id),
      created_at timestamptz NOT NULL DEFAULT now(),
      last_updated_at timestamptz NOT NULL DEFAULT now(),

      -- K7's idempotency guarantee: the nightly generator and the lazy
      -- backfill can both run for the same day without producing duplicates.
      -- Carried-over rows are the ONE legitimate second row for a
      -- (task, date), so they are excluded from the constraint.
      CONSTRAINT care_task_occurrences_task_date_uq UNIQUE (task_id, date_local, carry_over_from)
    );
    ALTER TABLE care_task_occurrences ENABLE ROW LEVEL SECURITY;

    -- The "today" read path: one index serving GET /occurrences?date=.
    CREATE INDEX care_task_occurrences_patient_date_idx
      ON care_task_occurrences (patient_id, date_local);
    CREATE INDEX care_task_occurrences_task_idx ON care_task_occurrences (task_id);
  `);

  // A NULL in a UNIQUE tuple never collides in Postgres, so the constraint
  // above would NOT stop two generated (non-carried-over) rows for the same
  // (task, date) — exactly the duplicate K7 promises can't happen. A partial
  // unique index over the generated rows is what actually enforces it.
  pgm.sql(`
    CREATE UNIQUE INDEX care_task_occurrences_generated_uq
      ON care_task_occurrences (task_id, date_local)
      WHERE carry_over_from IS NULL;
  `);

  pgm.sql(`
    CREATE POLICY care_task_occurrences_owner ON care_task_occurrences FOR ALL
      USING (patient_id = app_acting_user_id())
      WITH CHECK (patient_id = app_acting_user_id());

    CREATE POLICY care_task_occurrences_family_select ON care_task_occurrences FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM patient_family_links pfl
        WHERE pfl.patient_id = care_task_occurrences.patient_id
          AND pfl.family_user_id = app_acting_user_id()
          AND pfl.status = 'active'
      )
    );

    CREATE POLICY care_task_occurrences_caregiver_select ON care_task_occurrences FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM caregiver_links cl
        WHERE cl.patient_id = care_task_occurrences.patient_id
          AND cl.caregiver_id = app_acting_user_id()
          AND cl.status = 'linked'
      )
    );
  `);

  // ── activity_log (append-only domain trail, Modül 1 §6.3) ──────────────
  pgm.sql(`
    CREATE TABLE activity_log (
      event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id uuid NOT NULL REFERENCES users(user_id),
      entity_type text NOT NULL,
      entity_id uuid NOT NULL,
      task_id uuid,
      occurrence_id uuid,
      action text NOT NULL CHECK (action IN ${ACTIVITY_ACTIONS}),
      actor_type text NOT NULL CHECK (actor_type IN ${CREATOR_ACTORS}),
      actor_id uuid,
      -- Lighter than AuditLogEntry (Modül 1 §6.3): a domain trail the patient
      -- and their circle can actually SEE ("who completed this?"), not the
      -- security backbone. Same PHI discipline though — a diff of task fields
      -- is domain data the reader already has access to, never free text from
      -- elsewhere.
      diff jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

    CREATE INDEX activity_log_patient_created_idx ON activity_log (patient_id, created_at DESC);
    CREATE INDEX activity_log_occurrence_idx ON activity_log (occurrence_id);

    -- Append-only (Modül 1 §1.4).
    CREATE TRIGGER activity_log_immutable
      BEFORE UPDATE OR DELETE ON activity_log
      FOR EACH ROW EXECUTE FUNCTION reject_update_delete();

    -- Readable by the patient's whole circle — the day-end report and the
    -- "completed by caregiver" label are built from it. Writes come from the
    -- SECURITY DEFINER action functions, which run as the definer, so no
    -- INSERT policy is needed for cross-actor writes; the patient's own
    -- direct writes need one.
    CREATE POLICY activity_log_circle_select ON activity_log FOR SELECT USING (
      patient_id = app_acting_user_id()
      OR EXISTS (
        SELECT 1 FROM patient_family_links pfl
        WHERE pfl.patient_id = activity_log.patient_id
          AND pfl.family_user_id = app_acting_user_id()
          AND pfl.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM caregiver_links cl
        WHERE cl.patient_id = activity_log.patient_id
          AND cl.caregiver_id = app_acting_user_id()
          AND cl.status = 'linked'
      )
    );
    CREATE POLICY activity_log_owner_insert ON activity_log FOR INSERT
      WITH CHECK (patient_id = app_acting_user_id());
  `);

  // ── Authorization helper ───────────────────────────────────────────────
  // "May this actor act on this patient's care data, and in what role?"
  // Returns the actor's role for the patient, or NULL if unrelated. One
  // definition, so every action function agrees on who is who.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION care_actor_role(p_patient_id uuid, p_actor uuid)
    RETURNS text
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT CASE
        WHEN p_patient_id = p_actor THEN 'patient'
        WHEN EXISTS (
          SELECT 1 FROM caregiver_links cl
          WHERE cl.patient_id = p_patient_id AND cl.caregiver_id = p_actor AND cl.status = 'linked'
        ) THEN 'caregiver'
        WHEN EXISTS (
          SELECT 1 FROM patient_family_links pfl
          WHERE pfl.patient_id = p_patient_id AND pfl.family_user_id = p_actor AND pfl.status = 'active'
        ) THEN 'family'
        ELSE NULL
      END;
    $$;
  `);

  // ── Cross-actor task creation (family / caregiver) ─────────────────────
  // The actor type is derived HERE from the link tables, never taken from the
  // client (Modül 2 §3.3: "`created_by_actor_type` sunucuda türetilir,
  // istemciden alınmaz") — otherwise a family member could label their own
  // task as caregiver-created and change how it renders.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION care_task_create_for_patient(
      p_patient_id uuid,
      p_actor uuid,
      p_title text,
      p_type text,
      p_subtype text,
      p_schedule jsonb
    ) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    DECLARE
      v_role text;
      v_task_id uuid;
    BEGIN
      v_role := care_actor_role(p_patient_id, p_actor);
      IF v_role IS NULL THEN
        RETURN NULL; -- caller turns this into a 404 (entity-non-leaking)
      END IF;

      INSERT INTO care_tasks (
        patient_id, title, type, subtype, schedule,
        created_by, created_by_actor_type, source_provenance
      ) VALUES (
        p_patient_id, p_title, p_type, p_subtype, p_schedule,
        p_actor, v_role,
        CASE v_role WHEN 'patient' THEN 'manual' ELSE v_role END
      )
      RETURNING task_id INTO v_task_id;

      INSERT INTO activity_log (patient_id, entity_type, entity_id, task_id, action, actor_type, actor_id)
      VALUES (p_patient_id, 'care_task', v_task_id, v_task_id, 'created', v_role, p_actor);

      RETURN v_task_id;
    END;
    $$;
  `);

  // Occurrence materialization is ALSO a cross-actor write: when a family
  // member or caregiver creates a task, the occurrences that follow belong to
  // the PATIENT, and `care_task_occurrences` deliberately has no
  // family/caregiver INSERT policy (D12 discipline — no broad write policy
  // that a future code path could inherit). So generation goes through this
  // function, which re-derives the actor's role rather than trusting the
  // caller. The date planning itself stays in TypeScript
  // (`planOccurrences`, @sinalytix/domain) so the API and the nightly worker
  // expand a schedule identically; this function only writes what it is told,
  // for a patient the actor is genuinely attached to.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION occurrences_materialize(
      p_task_id uuid,
      p_actor uuid,
      p_planned jsonb,
      p_is_counter boolean
    ) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    DECLARE
      v_task care_tasks%ROWTYPE;
      v_inserted integer;
    BEGIN
      SELECT * INTO v_task FROM care_tasks WHERE task_id = p_task_id;
      IF NOT FOUND THEN RETURN 0; END IF;
      IF care_actor_role(v_task.patient_id, p_actor) IS NULL THEN RETURN 0; END IF;

      WITH ins AS (
        INSERT INTO care_task_occurrences (task_id, patient_id, date_local, time_local, progress_count)
        SELECT
          p_task_id,
          v_task.patient_id,
          (elem->>'date_local')::date,
          NULLIF(elem->>'time_local', '')::time,
          CASE WHEN p_is_counter THEN 0 ELSE NULL END
        FROM jsonb_array_elements(p_planned) AS elem
        -- K7 idempotency: the nightly job and a concurrent lazy backfill can
        -- race without producing a duplicate dose.
        ON CONFLICT DO NOTHING
        RETURNING 1
      )
      SELECT count(*)::int INTO v_inserted FROM ins;
      RETURN v_inserted;
    END;
    $$;
  `);

  // ── Occurrence actions ─────────────────────────────────────────────────
  // B1's last line of defence. `family` is rejected here even though the
  // PolicyEngine and the service already refuse it — three layers, because
  // this is the rule the doc set repeats more than any other.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION occurrence_complete(p_occurrence_id uuid, p_actor uuid, p_counter_value integer)
    RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    DECLARE
      v_occ care_task_occurrences%ROWTYPE;
      v_task care_tasks%ROWTYPE;
      v_role text;
      v_target integer;
      v_new_progress integer;
    BEGIN
      SELECT * INTO v_occ FROM care_task_occurrences WHERE occurrence_id = p_occurrence_id;
      IF NOT FOUND THEN RETURN 'not_found'; END IF;

      v_role := care_actor_role(v_occ.patient_id, p_actor);
      IF v_role IS NULL THEN RETURN 'not_found'; END IF;
      -- B1.
      IF v_role = 'family' THEN RETURN 'family_forbidden'; END IF;
      IF v_occ.status = 'done' THEN RETURN 'already_done'; END IF;

      SELECT * INTO v_task FROM care_tasks WHERE task_id = v_occ.task_id;

      IF v_task.type = 'counter' THEN
        -- Counter tasks accumulate and auto-complete at the target (legacy
        -- parity, LEGACY_HARVEST Faz 2). A tap without an explicit value is
        -- +1, which is what the "one more glass of water" button sends.
        v_target := COALESCE((v_task.schedule->>'target_per_day')::int, 1);
        v_new_progress := LEAST(COALESCE(v_occ.progress_count, 0) + COALESCE(p_counter_value, 1), v_target);
        UPDATE care_task_occurrences SET
          progress_count = v_new_progress,
          status = CASE WHEN v_new_progress >= v_target THEN 'done' ELSE 'todo' END,
          completed_at = CASE WHEN v_new_progress >= v_target THEN now() ELSE NULL END,
          completed_by = CASE WHEN v_new_progress >= v_target THEN p_actor ELSE NULL END,
          completed_by_actor_type = CASE WHEN v_new_progress >= v_target THEN v_role ELSE NULL END,
          last_updated_at = now()
        WHERE occurrence_id = p_occurrence_id;

        IF v_new_progress < v_target THEN
          RETURN 'progress';
        END IF;
      ELSE
        UPDATE care_task_occurrences SET
          status = 'done',
          completed_at = now(),
          completed_by = p_actor,
          completed_by_actor_type = v_role,
          skipped_at = NULL,
          skipped_by = NULL,
          last_updated_at = now()
        WHERE occurrence_id = p_occurrence_id;
      END IF;

      INSERT INTO activity_log (patient_id, entity_type, entity_id, task_id, occurrence_id, action, actor_type, actor_id)
      VALUES (v_occ.patient_id, 'care_task_occurrence', p_occurrence_id, v_occ.task_id, p_occurrence_id, 'completed', v_role, p_actor);

      RETURN 'done';
    END;
    $$;
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION occurrence_skip(p_occurrence_id uuid, p_actor uuid)
    RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    DECLARE
      v_occ care_task_occurrences%ROWTYPE;
      v_role text;
    BEGIN
      SELECT * INTO v_occ FROM care_task_occurrences WHERE occurrence_id = p_occurrence_id;
      IF NOT FOUND THEN RETURN 'not_found'; END IF;
      v_role := care_actor_role(v_occ.patient_id, p_actor);
      IF v_role IS NULL THEN RETURN 'not_found'; END IF;
      IF v_role = 'family' THEN RETURN 'family_forbidden'; END IF;
      IF v_occ.status = 'skipped' THEN RETURN 'already_skipped'; END IF;

      UPDATE care_task_occurrences SET
        status = 'skipped', skipped_at = now(), skipped_by = p_actor,
        completed_at = NULL, completed_by = NULL, completed_by_actor_type = NULL,
        last_updated_at = now()
      WHERE occurrence_id = p_occurrence_id;

      INSERT INTO activity_log (patient_id, entity_type, entity_id, task_id, occurrence_id, action, actor_type, actor_id)
      VALUES (v_occ.patient_id, 'care_task_occurrence', p_occurrence_id, v_occ.task_id, p_occurrence_id, 'skipped', v_role, p_actor);
      RETURN 'skipped';
    END;
    $$;
  `);

  // Undo returns an occurrence to `todo`. Authorization is narrower than
  // complete/skip: only the actor who performed it, or the patient (Modül 2
  // §3.3 "yalnız tamamlayan aktör veya hasta"). A caregiver must not be able
  // to quietly reverse another caregiver's record of giving a medication.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION occurrence_undo(p_occurrence_id uuid, p_actor uuid, p_window_seconds integer)
    RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    DECLARE
      v_occ care_task_occurrences%ROWTYPE;
      v_role text;
      v_acted_at timestamptz;
      v_prior_actor uuid;
    BEGIN
      SELECT * INTO v_occ FROM care_task_occurrences WHERE occurrence_id = p_occurrence_id;
      IF NOT FOUND THEN RETURN 'not_found'; END IF;
      v_role := care_actor_role(v_occ.patient_id, p_actor);
      IF v_role IS NULL THEN RETURN 'not_found'; END IF;
      IF v_role = 'family' THEN RETURN 'family_forbidden'; END IF;
      IF v_occ.status = 'todo' THEN RETURN 'nothing_to_undo'; END IF;

      v_acted_at := COALESCE(v_occ.completed_at, v_occ.skipped_at);
      v_prior_actor := COALESCE(v_occ.completed_by, v_occ.skipped_by);

      IF v_role <> 'patient' AND v_prior_actor IS DISTINCT FROM p_actor THEN
        RETURN 'not_actor';
      END IF;
      IF v_acted_at IS NOT NULL AND now() > v_acted_at + make_interval(secs => p_window_seconds) THEN
        RETURN 'window_expired';
      END IF;

      UPDATE care_task_occurrences SET
        status = 'todo',
        completed_at = NULL, completed_by = NULL, completed_by_actor_type = NULL,
        skipped_at = NULL, skipped_by = NULL,
        -- A counter task returns to zero, not to target-1: the tap being
        -- undone is the one that crossed the line, and leaving it "7 of 8"
        -- would show progress the patient just said didn't happen.
        progress_count = CASE WHEN v_occ.progress_count IS NULL THEN NULL ELSE 0 END,
        last_updated_at = now()
      WHERE occurrence_id = p_occurrence_id;

      INSERT INTO activity_log (patient_id, entity_type, entity_id, task_id, occurrence_id, action, actor_type, actor_id)
      VALUES (v_occ.patient_id, 'care_task_occurrence', p_occurrence_id, v_occ.task_id, p_occurrence_id, 'undone', v_role, p_actor);
      RETURN 'undone';
    END;
    $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP FUNCTION IF EXISTS occurrences_materialize(uuid, uuid, jsonb, boolean);
    DROP FUNCTION IF EXISTS occurrence_undo(uuid, uuid, integer);
    DROP FUNCTION IF EXISTS occurrence_skip(uuid, uuid);
    DROP FUNCTION IF EXISTS occurrence_complete(uuid, uuid, integer);
    DROP FUNCTION IF EXISTS care_task_create_for_patient(uuid, uuid, text, text, text, jsonb);
    DROP FUNCTION IF EXISTS care_actor_role(uuid, uuid);
  `);
  pgm.sql(`DROP TABLE IF EXISTS activity_log;`);
  pgm.sql(`DROP TABLE IF EXISTS care_task_occurrences;`);
  pgm.sql(`
    DROP TRIGGER IF EXISTS care_tasks_version_bump ON care_tasks;
    DROP FUNCTION IF EXISTS bump_care_task_version();
  `);
  pgm.sql(`DROP TABLE IF EXISTS care_tasks;`);
};
