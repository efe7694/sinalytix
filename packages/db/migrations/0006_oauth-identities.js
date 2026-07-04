/**
 * oauth_identities — maps a verified Apple/Google `sub` claim to a `User`.
 *
 * Not in the Canonical Dictionary: the R2 spec describes `User.auth_methods[]`
 * but never defines how an SSO provider's subject identifier resolves to a
 * user_id, which find-or-create SSO login genuinely needs (matching by email
 * alone is unsafe — Apple's private-relay emails, email changes). Same
 * category as Module 3's `event_outbox`/`job_runs`: an infra-internal table
 * required for the system to function, not a domain entity. See DEVIATIONS.md D5.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE oauth_identities (
      oauth_identity_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(user_id),
      provider text NOT NULL CHECK (provider IN ('apple_sso','google_sso')),
      provider_subject text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX oauth_identities_provider_subject_uq
      ON oauth_identities (provider, provider_subject);
    ALTER TABLE oauth_identities ENABLE ROW LEVEL SECURITY;
    CREATE POLICY oauth_identities_self ON oauth_identities FOR ALL
      USING (user_id = app_acting_user_id())
      WITH CHECK (user_id = app_acting_user_id());
  `);

  // Same bootstrap problem as phone/email lookup (Module 2 §3.1 signup/login):
  // finding a user by SSO subject happens before any acting user is set.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION auth_find_user_by_oauth_subject(p_provider text, p_subject text)
    RETURNS TABLE(user_id uuid, status text, roles text[], locale text, auth_methods text[])
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT u.user_id, u.status, u.roles, u.locale, u.auth_methods
      FROM oauth_identities oi JOIN users u ON u.user_id = oi.user_id
      WHERE oi.provider = p_provider AND oi.provider_subject = p_subject AND u.deleted_at IS NULL;
    $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP FUNCTION IF EXISTS auth_find_user_by_oauth_subject(text, text);`);
  pgm.sql(`DROP TABLE IF EXISTS oauth_identities;`);
};
