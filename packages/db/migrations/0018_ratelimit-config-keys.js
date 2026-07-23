/**
 * Rate-limit quotas as `SystemConfig` keys — Modül 2 §1.5 + §9.4 / K11.
 * DEVIATIONS.md D15 item B6.
 *
 * K11 is explicit that §1.5's numbers are a starting constant to be
 * "yük testi sonrası `SystemConfig` üzerinden kalibre" — so they are keys
 * from day one rather than constants that need a redeploy to move.
 *
 * A separate migration rather than an edit to 0015's seed block: 0015 has
 * already run in the dev and test databases, and an edited migration is
 * simply never re-applied (Mühendislik El Kitabı §4 — migrations are
 * forward-written; a correction is a new migration, not a rewrite).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO system_config (key, value, requires_second_approval) VALUES
      ('ratelimit.read_per_min',  '300'::jsonb, false),
      ('ratelimit.write_per_min', '60'::jsonb,  false),
      ('ratelimit.auth_per_min',  '10'::jsonb,  false)
    ON CONFLICT (key) DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM system_config
    WHERE key IN ('ratelimit.read_per_min', 'ratelimit.write_per_min', 'ratelimit.auth_per_min');
  `);
};
