/**
 * PatientFamilyLink + FamilyLinkCode wire contracts — Module 2 §3.4 (Faz 1
 * Slice 3), Dictionary §2/§4/§6, C13/C22.
 */

import { z } from 'zod';
import { FamilyLinkSource, FamilyLinkStatus, LinkPermissionLevel } from './enums';

// ── FamilyLinkCode (patient side: generate/revoke) ──────────────────────

export const GenerateFamilyLinkCodeResponseSchema = z.object({
  link_code_id: z.string().uuid(),
  code: z.string(),
  qr_payload: z.string(),
  expires_at: z.string().datetime(),
});
export type GenerateFamilyLinkCodeResponse = z.infer<typeof GenerateFamilyLinkCodeResponseSchema>;

// ── Redeem (family side) ─────────────────────────────────────────────────

// `relationship` is required for code/qr sources (the family member states
// it themselves) but ignored for ec_invite (inherited from the
// EmergencyContact row's own `relationship` — the patient already stated it
// when adding that contact, so re-collecting it would risk disagreement
// between the two records for the same person).
export const RedeemFamilyLinkRequestSchema = z
  .object({
    code: z.string().length(6).optional(),
    qr_payload: z.string().min(1).optional(),
    relationship: z.string().min(1).optional(),
  })
  .refine((body) => (body.code ? 1 : 0) + (body.qr_payload ? 1 : 0) === 1, {
    message: 'Tam olarak code veya qr_payload alanlarından biri gönderilmeli.',
  });
export type RedeemFamilyLinkRequest = z.infer<typeof RedeemFamilyLinkRequestSchema>;

// ── PatientFamilyLink (both sides read this) ────────────────────────────

/**
 * `PATCH /family-links/{id}` — Modül 2 §3.4 (FAM-13). Deliberately a single
 * field: this endpoint exists to change the permission level and nothing
 * else, so a caller can never sneak `status` or `family_user_id` past it.
 */
export const UpdateFamilyLinkPermissionRequestSchema = z
  .object({
    permission_level: z.nativeEnum(LinkPermissionLevel),
  })
  .strict();
export type UpdateFamilyLinkPermissionRequest = z.infer<typeof UpdateFamilyLinkPermissionRequestSchema>;

export const PatientFamilyLinkPublicSchema = z.object({
  link_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  family_user_id: z.string().uuid(),
  relationship: z.string(),
  status: z.nativeEnum(FamilyLinkStatus),
  permission_level: z.nativeEnum(LinkPermissionLevel),
  source: z.nativeEnum(FamilyLinkSource),
  emergency_contact_id: z.string().uuid().nullable(),
  baseline_grant_id: z.string().uuid().nullable(),
  linked_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});
export type PatientFamilyLinkPublic = z.infer<typeof PatientFamilyLinkPublicSchema>;

// `GET /family/my-links` — a family member's own roster, joined with each
// linked patient's display fields. Structurally different from
// PatientFamilyLinkPublic (that's the raw link row; this is what the family
// app's patient-switcher UI actually renders) — kept as its own schema
// rather than overloading one shape for two call sites.
export const LinkedPatientSummarySchema = z.object({
  patient_id: z.string().uuid(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  relationship: z.string(),
  permission_level: z.nativeEnum(LinkPermissionLevel),
  linked_at: z.string().datetime().nullable(),
});
export type LinkedPatientSummary = z.infer<typeof LinkedPatientSummarySchema>;
