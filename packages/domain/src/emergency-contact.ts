/**
 * EmergencyContact wire contract — Module 2 §3.3, Dictionary §4/C20/C21/C23.
 */

import { z } from 'zod';
import { E164PhoneSchema } from './user';

export const InviteStatus = {
  PENDING: 'pending',
  ACCEPTED_APP_USER: 'accepted_app_user',
  ACCEPTED_PHONE_ONLY: 'accepted_phone_only',
} as const;
export type InviteStatus = (typeof InviteStatus)[keyof typeof InviteStatus];

// sort_order is server-assigned (next free 1-3 slot), not client-supplied —
// matches the actual onboarding/settings UI, which only ever collects
// name/relationship/phone and lets the backend append to the end of the list.
export const CreateEmergencyContactRequestSchema = z.object({
  relationship: z.string().min(1),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  phone: E164PhoneSchema,
});
export type CreateEmergencyContactRequest = z.infer<typeof CreateEmergencyContactRequestSchema>;

export const UpdateEmergencyContactRequestSchema = z
  .object({
    relationship: z.string().min(1),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    phone: E164PhoneSchema,
  })
  .partial();
export type UpdateEmergencyContactRequest = z.infer<typeof UpdateEmergencyContactRequestSchema>;

export const ReorderEmergencyContactsRequestSchema = z.object({
  ordered_ids: z
    .array(z.string().uuid())
    .min(1)
    .max(3)
    // Without this, a duplicate id (e.g. [A, A]) passes the service's
    // length+membership ownership check while silently omitting another
    // owned contact from the reorder — found by an adversarial PR review,
    // reproduced against a live DB (the omitted contact's sort_order was
    // left untouched, no error).
    .refine((ids) => new Set(ids).size === ids.length, 'ordered_ids yinelenen id içeremez.'),
});
export type ReorderEmergencyContactsRequest = z.infer<typeof ReorderEmergencyContactsRequestSchema>;

export const VerifyPhoneRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('request_code') }),
  z.object({ action: z.literal('verify_code'), code: z.string().length(6) }),
]);
export type VerifyPhoneRequest = z.infer<typeof VerifyPhoneRequestSchema>;

export const EmergencyContactPublicSchema = z.object({
  ec_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  relationship: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  phone: z.string(),
  phone_verified: z.boolean(),
  sort_order: z.number().int(),
  invite_status: z.nativeEnum(InviteStatus),
  linked_family_user_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
});
export type EmergencyContactPublic = z.infer<typeof EmergencyContactPublicSchema>;

/**
 * The result of an emergency-contact mutation that may be gated behind family
 * approval (FAM-12 `ec_change`).
 *
 * A union rather than an optional field, because the two cases are genuinely
 * different outcomes and a client that forgets to handle the second one
 * should fail to compile rather than render a blank contact card. `executed:
 * false` means NOTHING has changed yet — the family has 48 hours to decide
 * (K4), and the UI must say "waiting for approval", not show the contact as
 * if it were saved.
 *
 * `contact` is null on a gated REMOVE that executed (nothing to return) and
 * on the deferred branch.
 */
export const EmergencyContactMutationResultSchema = z.discriminatedUnion('executed', [
  z.object({
    executed: z.literal(true),
    contact: EmergencyContactPublicSchema.nullable(),
    approval_id: z.null(),
  }),
  z.object({
    executed: z.literal(false),
    contact: z.null(),
    approval_id: z.string().uuid(),
  }),
]);
export type EmergencyContactMutationResult = z.infer<typeof EmergencyContactMutationResultSchema>;
