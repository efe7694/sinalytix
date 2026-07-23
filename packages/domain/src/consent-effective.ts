/**
 * Effective consent flags — the "does this user currently hold flag X?"
 * question, which is what every gate actually asks.
 *
 * `ConsentRecord` is append-only and versioned: a user has many rows, and the
 * live answer is the LATEST row per `app_context`. Modül 2 §3.2 only defines
 * write + history endpoints, so without this every caller (the AI consent
 * gate of Modül 4 §1 step 1, an onboarding resume screen, a settings toggle)
 * would re-derive "latest wins" for itself — and one of them would get it
 * wrong. B9 makes that concrete: `ack_ai_processing` lives in exactly one
 * place, so exactly one place should compute whether it is held.
 */

import { z } from 'zod';
import { AppContext, ConsentFlag } from './enums';

export const EffectiveConsentSchema = z.object({
  app_context: z.nativeEnum(AppContext),
  /** Version of the ToS/Privacy document the newest record was given under. */
  version: z.string(),
  consented_at: z.string().datetime(),
  /** Flags from the newest record only — flags are NOT merged across
   * versions. Accepting v1 and later declining a flag in v2 must leave that
   * flag off; a union would silently resurrect a withdrawn acknowledgement. */
  flags: z.record(z.nativeEnum(ConsentFlag), z.boolean()),
});
export type EffectiveConsent = z.infer<typeof EffectiveConsentSchema>;

export const EffectiveConsentListSchema = z.object({
  data: z.array(EffectiveConsentSchema),
});
export type EffectiveConsentList = z.infer<typeof EffectiveConsentListSchema>;
