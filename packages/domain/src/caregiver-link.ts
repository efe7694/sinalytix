/**
 * CaregiverLink wire contracts — Module 2 §3.4 (Faz 1 Slice 4), Dictionary
 * §4/C22, LINK_01. Distinct from the family-link fabric: no baseline grant,
 * no patient-confirm step.
 */

import { z } from 'zod';
import { CaregiverLinkStatus } from './enums';

// ── Patient side: generate / revoke the caregiver code ──────────────────

export const GenerateCaregiverLinkCodeResponseSchema = z.object({
  link_id: z.string().uuid(),
  code: z.string(),
  qr_payload: z.string(),
  expires_at: z.string().datetime(),
});
export type GenerateCaregiverLinkCodeResponse = z.infer<typeof GenerateCaregiverLinkCodeResponseSchema>;

// ── Caregiver side: redeem ───────────────────────────────────────────────

// Exactly one of code / qr_payload. The caregiver app uppercases the typed
// code, but the server also uppercases at lookup (legacy parity) so a
// lowercase code still resolves.
export const RedeemCaregiverLinkRequestSchema = z
  .object({
    code: z.string().min(4).max(12).optional(),
    qr_payload: z.string().min(1).optional(),
  })
  .refine((b) => (b.code ? 1 : 0) + (b.qr_payload ? 1 : 0) === 1, {
    message: 'Tam olarak code veya qr_payload alanlarından biri gönderilmeli.',
  });
export type RedeemCaregiverLinkRequest = z.infer<typeof RedeemCaregiverLinkRequestSchema>;

// ── Roster / link shapes ─────────────────────────────────────────────────

/** What `POST /caregiver-links/redeem` returns and what the caregiver's
 * `GET /caregiver/my-patients` roster renders per patient. Structurally the
 * caregiver-facing view of a link, joined with the patient's display name. */
export const LinkedPatientForCaregiverSchema = z.object({
  link_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  status: z.nativeEnum(CaregiverLinkStatus),
  linked_at: z.string().datetime().nullable(),
});
export type LinkedPatientForCaregiver = z.infer<typeof LinkedPatientForCaregiverSchema>;
