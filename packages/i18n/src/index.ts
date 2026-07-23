/**
 * @sinalytix/i18n — EN/FR/TR string catalogs shared by every service and app.
 *
 * Mühendislik El Kitabı §2 lists this package; Tasarım Sistemi §6 is the
 * rule it enforces: "tüm UI dizeleri anahtar-tabanlı (kod içinde literal
 * yasak)". It starts with the API error catalog (the first surface that was
 * shipping hardcoded Turkish to every locale) and grows as notification
 * templates and app UI strings are keyed.
 *
 * Deliberately dependency-free, like `@sinalytix/policy-engine` and
 * `@sinalytix/config`: it is imported on request paths in every service and
 * inside three React Native bundles.
 */

export * from './locale';
export * from './error-messages';
