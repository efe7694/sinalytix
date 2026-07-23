/**
 * Faz 0 — User, Organization, PractitionerRole, *Profile extensions, AdminUser.
 * Column names copied verbatim from docs/spec/Sinalytix_Canonical_Data_Dictionary.md (v0.2) §1.
 *
 * Cross-app visibility of profile extensions via ConsentGrant (family/caregiver
 * viewing a patient's profile) is Faz 1 scope — for now, every profile table is
 * self-access only.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE users (
      user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email citext UNIQUE,
      email_verified boolean NOT NULL DEFAULT false,
      phone_e164 text UNIQUE,
      phone_verified boolean NOT NULL DEFAULT false,
      auth_methods text[] NOT NULL DEFAULT '{}',
      password_hash text,
      locale text NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'fr', 'tr')),
      status text NOT NULL DEFAULT 'incomplete' CHECK (
        status IN ('incomplete','active','suspended_soft','suspended_hard','dormant','deactivated')
      ),
      roles text[] NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;

    -- Bootstrap exception: signup creates a row before any acting user exists.
    -- Every other statement requires user_id = the already-established actor.
    CREATE POLICY users_self_select ON users FOR SELECT USING (user_id = app_acting_user_id());
    CREATE POLICY users_self_update ON users FOR UPDATE USING (user_id = app_acting_user_id());
    CREATE POLICY users_bootstrap_insert ON users FOR INSERT WITH CHECK (
      app_acting_user_id() IS NULL OR user_id = app_acting_user_id()
    );
  `);

  pgm.sql(`
    CREATE TABLE organizations (
      org_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      type text NOT NULL CHECK (
        type IN ('self','home_care_agency','clinic','hospital','community_health','other')
      ),
      name text NOT NULL,
      invisible_to_users boolean NOT NULL DEFAULT false,
      parent_org_id uuid REFERENCES organizations(org_id),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
  `);

  pgm.sql(`
    CREATE TABLE practitioner_roles (
      practitioner_role_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(user_id),
      org_id uuid NOT NULL REFERENCES organizations(org_id),
      discipline_code text NOT NULL,
      specialty text[] NOT NULL DEFAULT '{}',
      province_code text NOT NULL,
      -- References LicenseRecord (Module 1 §3.4), not migrated until Faz 5 (HCP
      -- credentialing). FK constraint added then (expand-contract, Module 3 §9.2).
      license_record_id uuid,
      active boolean NOT NULL DEFAULT true,
      period_start timestamptz,
      period_end timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE practitioner_roles ENABLE ROW LEVEL SECURITY;

    CREATE POLICY practitioner_roles_visible ON practitioner_roles FOR SELECT USING (
      user_id = app_acting_user_id() OR org_id = app_acting_org_id()
    );
    CREATE POLICY practitioner_roles_self_insert ON practitioner_roles FOR INSERT WITH CHECK (
      user_id = app_acting_user_id()
    );
  `);

  // Added now that practitioner_roles exists (policy subquery needs the table present).
  pgm.sql(`
    CREATE POLICY organizations_visible ON organizations FOR SELECT USING (
      org_id = app_acting_org_id()
      OR EXISTS (
        SELECT 1 FROM practitioner_roles pr
        WHERE pr.org_id = organizations.org_id AND pr.user_id = app_acting_user_id()
      )
    );
  `);

  pgm.sql(`
    CREATE TABLE patient_profiles (
      user_id uuid PRIMARY KEY REFERENCES users(user_id),
      identifier_set jsonb NOT NULL DEFAULT '{}',
      date_of_birth date,
      conditions_declared text[] NOT NULL DEFAULT '{}',
      allergies_declared text[] NOT NULL DEFAULT '{}',
      declared_confidence text CHECK (
        declared_confidence IN ('professionally_diagnosed','self_declared','prefer_not_to_say')
      ),
      dnr_status text,
      sensitive_categories_present text[] NOT NULL DEFAULT '{}',
      org_id_primary uuid REFERENCES organizations(org_id),
      timezone_iana text NOT NULL DEFAULT 'America/Toronto',
      preferences jsonb NOT NULL DEFAULT '{}',
      first_name text,
      last_name text,
      avatar_url text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY patient_profiles_self ON patient_profiles FOR ALL
      USING (user_id = app_acting_user_id())
      WITH CHECK (user_id = app_acting_user_id());
  `);

  pgm.sql(`
    CREATE TABLE family_profiles (
      user_id uuid PRIMARY KEY REFERENCES users(user_id),
      dnd boolean NOT NULL DEFAULT false,
      first_name text,
      last_name text,
      avatar_url text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE family_profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY family_profiles_self ON family_profiles FOR ALL
      USING (user_id = app_acting_user_id())
      WITH CHECK (user_id = app_acting_user_id());
  `);

  pgm.sql(`
    CREATE TABLE caregiver_profiles (
      user_id uuid PRIMARY KEY REFERENCES users(user_id),
      agency_id uuid REFERENCES organizations(org_id),
      employee_id text,
      role text NOT NULL CHECK (role IN ('psw','rpn','rn','hca','other')),
      availability_status text NOT NULL DEFAULT 'available' CHECK (
        availability_status IN ('available','unavailable','on_shift')
      ),
      first_name text,
      last_name text,
      avatar_url text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE caregiver_profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY caregiver_profiles_self ON caregiver_profiles FOR ALL
      USING (user_id = app_acting_user_id())
      WITH CHECK (user_id = app_acting_user_id());

    -- employee_id is unique within an agency, not globally (Dictionary §1: "agency içi unique").
    CREATE UNIQUE INDEX caregiver_profiles_agency_employee_uq
      ON caregiver_profiles (agency_id, employee_id)
      WHERE agency_id IS NOT NULL AND employee_id IS NOT NULL;
  `);

  pgm.sql(`
    -- admin_role values aren't enumerated anywhere in the R2 spec (Module 1 §3.2
    -- just says "admin_role enum" — credential review / recovery / compliance are
    -- named as examples, not an exhaustive list), so left as free text rather than
    -- inventing an authoritative set the spec doesn't define.
    CREATE TABLE admin_users (
      user_id uuid PRIMARY KEY REFERENCES users(user_id),
      admin_role text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
    CREATE POLICY admin_users_self ON admin_users FOR ALL
      USING (user_id = app_acting_user_id())
      WITH CHECK (user_id = app_acting_user_id());
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS admin_users;`);
  pgm.sql(`DROP TABLE IF EXISTS caregiver_profiles;`);
  pgm.sql(`DROP TABLE IF EXISTS family_profiles;`);
  pgm.sql(`DROP TABLE IF EXISTS patient_profiles;`);
  pgm.sql(`DROP TABLE IF EXISTS practitioner_roles;`);
  pgm.sql(`DROP TABLE IF EXISTS organizations;`);
  pgm.sql(`DROP TABLE IF EXISTS users;`);
};
