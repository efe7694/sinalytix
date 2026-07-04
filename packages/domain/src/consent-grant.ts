/**
 * ConsentGrant + SDMDeclaration wire contracts — Module 2 §3.2, Dictionary
 * §2/§4.2. Distinct from consent.ts's ConsentRecord (immutable legal/ToS
 * consent) — this is the revocable, runtime data-sharing grant.
 */

import { z } from 'zod';
import { GrantedToKind, Permission } from './enums';

export const CreateConsentGrantRequestSchema = z.object({
  granted_to_kind: z.nativeEnum(GrantedToKind),
  granted_to_id: z.string().uuid(),
  scope: z.array(z.string()).min(1),
  permission: z.nativeEnum(Permission),
  period_start: z.string().datetime().optional(),
  period_end: z.string().datetime().optional(),
});
export type CreateConsentGrantRequest = z.infer<typeof CreateConsentGrantRequestSchema>;

export const ConsentGrantPublicSchema = z.object({
  grant_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  granted_to_kind: z.nativeEnum(GrantedToKind),
  granted_to_id: z.string().uuid(),
  scope: z.array(z.string()),
  permission: z.nativeEnum(Permission),
  period_start: z.string().datetime().nullable(),
  period_end: z.string().datetime().nullable(),
  granted_by: z.string().uuid(),
  revoked_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});
export type ConsentGrantPublic = z.infer<typeof ConsentGrantPublicSchema>;

export const RevokeConsentGrantResponseSchema = z.object({
  grant_id: z.string().uuid(),
  revoked_at: z.string().datetime(),
});
export type RevokeConsentGrantResponse = z.infer<typeof RevokeConsentGrantResponseSchema>;

export const CreateSdmDeclarationRequestSchema = z.object({
  sdm_user_id: z.string().uuid(),
  province_rule: z.literal('ON_HCCA'),
  poa_document_id: z.string().uuid().optional(),
});
export type CreateSdmDeclarationRequest = z.infer<typeof CreateSdmDeclarationRequestSchema>;

export const SdmDeclarationPublicSchema = z.object({
  sdm_declaration_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  sdm_user_id: z.string().uuid(),
  province_rule: z.literal('ON_HCCA'),
  active: z.boolean(),
  activated_by: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
});
export type SdmDeclarationPublic = z.infer<typeof SdmDeclarationPublicSchema>;
