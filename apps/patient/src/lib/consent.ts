import { CORE_API_BASE_URL } from '@/lib/api';
import type { ConsentDraft } from '@/store/onboarding';

/**
 * Records the onboarding consent on core-api (`POST /consents`,
 * Modül 2 §3.2 — DEVIATIONS D15 item B4).
 *
 * Until now the consent draft went ONLY to the legacy
 * `/api/v1/auth/complete-onboarding` endpoint, bundled with the emergency
 * contact and health seed. That is the wrong home for it in two ways:
 * `ConsentRecord` is the immutable, versioned, legally load-bearing artifact
 * PIPEDA requires (Uyum Listesi §2), and it must be written **before** any
 * clinical data (Modül 1 §13) — not alongside it in one best-effort call.
 *
 * So this runs on its own, immediately after auth. The legacy call still
 * carries EC + health seed until their own slices rewire them (the dual-client
 * migration pattern, DEVIATIONS D9).
 *
 * Written with a raw `fetch` rather than the `coreApi` client on purpose: the
 * client reads its token from the auth store, and during onboarding the token
 * exists before the store has been populated.
 */
export async function submitConsentRecord(
  accessToken: string,
  draft: ConsentDraft,
  tosVersion: string,
): Promise<void> {
  await fetch(`${CORE_API_BASE_URL}/consents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-App-Context': 'patient',
      'X-Idempotency-Key': randomKey(),
      'Accept-Language': 'tr',
    },
    body: JSON.stringify({
      app_context: 'patient',
      version: tosVersion,
      recorded_channel: 'in_app',
      flags: {
        accept_tos: draft.accept_tos,
        accept_privacy: draft.accept_privacy,
        ack_not_emergency: draft.ack_not_emergency,
      },
      // The moment the human tapped accept, which is what the record is
      // about — the server stamps its own `server_recorded_at` separately.
      consented_at: draft.consented_at ?? new Date().toISOString(),
    }),
  });
}

function randomKey(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
