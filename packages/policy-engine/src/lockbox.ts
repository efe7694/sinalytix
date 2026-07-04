/**
 * Lockbox categories (Dictionary §8, B5) — default-hidden; each requires its
 * own explicit ConsentGrant, never inherited from a baseline/broader grant.
 * `substance_use` is locked at every ingest/enforcement point without
 * exception (B5) — there is no special-case bypass for it in this module.
 */

export const LOCKBOX_CATEGORIES = ['mental_health', 'hiv_sti', 'gender_identity', 'substance_use'] as const;

export type LockboxCategory = (typeof LOCKBOX_CATEGORIES)[number];

export function isLockboxCategory(category: string): category is LockboxCategory {
  return (LOCKBOX_CATEGORIES as readonly string[]).includes(category);
}
