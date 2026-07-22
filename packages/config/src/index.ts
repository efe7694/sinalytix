/**
 * @sinalytix/config — the code side of K10.
 *
 * K10 forbids compiling runtime constants into services; they come from
 * `SystemConfig`. This package owns the typed key registry, the defaults and
 * the validation, but has NO database access — the reader
 * (`SystemConfigService`, core-api) supplies rows. That split is what lets a
 * cron job, the worker, the rt-gateway and a unit test all agree on what
 * `approval.expiry_hours` means without any of them opening a connection.
 *
 * Also holds `SESSION_POLICY` (K9/A4), which is deliberately NOT a
 * SystemConfig key — see session-policy.ts for why.
 */

export * from './system-config';
export * from './feature-flags';
export * from './session-policy';
