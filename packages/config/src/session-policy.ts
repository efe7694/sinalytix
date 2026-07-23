/**
 * Per-app_context session policy — Modül 1 §3.5 + Admin Panel PRD §2 (K9).
 * DEVIATIONS.md D15 item A4.
 *
 * Faz 0 shipped ONE policy for every surface (5 concurrent sessions, 90-day
 * absolute, 30-day idle). K9 makes that wrong: an admin session is
 * `max 2 eşzamanlı`, `8 saat mutlak`, `15dk idle timeout`. Those numbers
 * are an order of magnitude tighter than a consumer app's, and the
 * difference is the whole point — an admin session is the most dangerous
 * credential in the system (it can reveal PHI), a patient's is the least
 * (their own data, on their own phone, re-auth is an SMS away).
 *
 * These are NOT `SystemConfig` keys. Admin PRD A7's V0 key list deliberately
 * omits them: session lifetime is a security parameter fixed by the spec, not
 * something ops tunes at runtime — an operator who could stretch the admin
 * idle timeout could quietly undo the control. Keeping them as code
 * constants means changing one is a reviewed PR, not a config edit.
 *
 * The consumer/HCP absolute+idle values are Faz 0's; the spec fixes only the
 * concurrency cap (5) for them, so those two durations remain a product
 * choice rather than a spec quote (noted so a future reader doesn't go
 * looking for them in Modül 1).
 */

export interface SessionPolicy {
  /** Modül 1 §3.5: "Eşzamanlı oturum üst sınırı 5 (admin: 2)". */
  readonly maxConcurrent: number;
  /** Hard ceiling from issue time; re-login required after. */
  readonly absoluteMs: number;
  /** Rolling — extended on each authenticated request. */
  readonly idleMs: number;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const CONSUMER_POLICY: SessionPolicy = {
  maxConcurrent: 5,
  absoluteMs: 90 * DAY,
  idleMs: 30 * DAY,
};

export const SESSION_POLICY = {
  patient: CONSUMER_POLICY,
  family: CONSUMER_POLICY,
  caregiver: CONSUMER_POLICY,
  hcp: CONSUMER_POLICY,
  // Admin Panel PRD §2: "Oturum: max 8 saat, 15dk idle timeout" + Modül 1
  // §3.5 "(admin: 2 ...)".
  admin: {
    maxConcurrent: 2,
    absoluteMs: 8 * HOUR,
    idleMs: 15 * MINUTE,
  },
} as const satisfies Record<string, SessionPolicy>;

export type SessionPolicyAppContext = keyof typeof SESSION_POLICY;

export function sessionPolicyFor(appContext: string): SessionPolicy {
  return (SESSION_POLICY as Record<string, SessionPolicy | undefined>)[appContext] ?? CONSUMER_POLICY;
}
