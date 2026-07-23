/**
 * @sinalytix/domain — canonical R2 wire contracts (Faz 0 scope).
 *
 * Mirrors Sinalytix_Canonical_Data_Dictionary__R2.md + Core Infra Modules 1-2.
 * Distinct from @sinalytix/shared, which serves the 3 pre-R2 apps against
 * the legacy Python backend (see DEVIATIONS.md D1). Consumers of this
 * package: services/core-api and any app rewired against the new API.
 */

export * from './enums';
export * from './errors';
export * from './user';
export * from './consent';
export * from './consent-effective';
export * from './consent-grant';
export * from './emergency-contact';
export * from './family-link';
export * from './caregiver-link';
export * from './approval';
export * from './pagination';
