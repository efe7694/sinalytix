/**
 * AuditLogEntry + PolicyDecision (Module 1 §8.1, Module 3 §2.3).
 *
 * Scoping note: Module 1 §8.1 specifies monthly partitioning for
 * AuditLogEntry, maintained by job J8 (Module 3 §4) which doesn't exist until
 * job-runner is populated (Faz 2/3+). Building a partition scheme with no job
 * to roll it forward would be a half-finished implementation, so this starts
 * as a plain table; partitioning is added when J8 lands.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE audit_log_entries (
      audit_log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type text NOT NULL,
      event_category text NOT NULL CHECK (
        event_category IN ('auth','session','clinical','consent','admin','security','integration','ingestion')
      ),
      event_severity text NOT NULL CHECK (event_severity IN ('info','warning','critical')),
      user_id uuid,
      acting_user_id uuid,
      acting_practitioner_role_id uuid,
      acting_org_id uuid,
      resource_type text,
      resource_id uuid,
      session_id uuid,
      device_fp_hash text,
      ip_hash text,
      ua_hash text,
      event_data jsonb NOT NULL DEFAULT '{}',
      acted_at timestamptz NOT NULL DEFAULT now(),
      inserted_at timestamptz NOT NULL DEFAULT now(),
      batch_hmac text,
      archived_at timestamptz
    );
    ALTER TABLE audit_log_entries ENABLE ROW LEVEL SECURITY;

    CREATE TRIGGER audit_log_entries_immutable
      BEFORE UPDATE OR DELETE ON audit_log_entries
      FOR EACH ROW EXECUTE FUNCTION reject_update_delete();

    -- Any request can produce an audit entry about itself; only admins read
    -- the trail (Dictionary §10 read matrix: "yalnızca denetim/admin").
    CREATE POLICY audit_log_entries_insert ON audit_log_entries FOR INSERT WITH CHECK (true);
    CREATE POLICY audit_log_entries_admin_select ON audit_log_entries FOR SELECT USING (
      app_has_role('admin')
    );
  `);

  pgm.sql(`
    CREATE TABLE policy_decisions (
      policy_decision_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      subject_practitioner_role_id uuid,
      actor_user_id uuid,
      action text NOT NULL,
      resource text NOT NULL,
      context_snapshot jsonb NOT NULL DEFAULT '{}',
      decision text NOT NULL CHECK (decision IN ('permit','deny')),
      reasons text[] NOT NULL DEFAULT '{}',
      obligations jsonb NOT NULL DEFAULT '{}',
      policy_engine_version text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE policy_decisions ENABLE ROW LEVEL SECURITY;

    CREATE TRIGGER policy_decisions_immutable
      BEFORE UPDATE OR DELETE ON policy_decisions
      FOR EACH ROW EXECUTE FUNCTION reject_update_delete();

    CREATE POLICY policy_decisions_insert ON policy_decisions FOR INSERT WITH CHECK (true);
    CREATE POLICY policy_decisions_admin_select ON policy_decisions FOR SELECT USING (
      app_has_role('admin')
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS policy_decisions;`);
  pgm.sql(`DROP TABLE IF EXISTS audit_log_entries;`);
};
