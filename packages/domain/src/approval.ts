/**
 * ApprovalRequest + PatientApprovalConfig wire contracts — Module 3 (Faz 1
 * Slice 5). A generic family-approval gate over sensitive link actions.
 */

import { z } from 'zod';
import { ApprovalActionType, ApprovalStatus, LinkPermissionLevel, RequestedByRole } from './enums';

// ── PatientApprovalConfig (patient side, PATCH not PUT) ─────────────────

export const UpdateApprovalConfigRequestSchema = z.object({
  action_type: z.nativeEnum(ApprovalActionType),
  requires_approval: z.boolean(),
});
export type UpdateApprovalConfigRequest = z.infer<typeof UpdateApprovalConfigRequestSchema>;

export const PatientApprovalConfigPublicSchema = z.object({
  patient_id: z.string().uuid(),
  action_type: z.nativeEnum(ApprovalActionType),
  requires_approval: z.boolean(),
});
export type PatientApprovalConfigPublic = z.infer<typeof PatientApprovalConfigPublicSchema>;

// ── family_link_permission_change trigger (family member, own link) ─────

export const RequestFamilyPermissionChangeRequestSchema = z.object({
  permission_level: z.nativeEnum(LinkPermissionLevel),
});
export type RequestFamilyPermissionChangeRequest = z.infer<typeof RequestFamilyPermissionChangeRequestSchema>;

// ── ApprovalRequest (what the family approvals screen renders) ──────────

// `description` and `requested_by_name` are server-computed convenience fields
// (the raw table has only action_payload jsonb + requested_by uuid) — added
// to the DTO so the 3 apps don't each reimplement an action→string mapper.
export const ApprovalRequestPublicSchema = z.object({
  approval_id: z.string().uuid(),
  action_type: z.nativeEnum(ApprovalActionType),
  status: z.nativeEnum(ApprovalStatus),
  requested_by: z.string().uuid(),
  requested_by_role: z.nativeEnum(RequestedByRole),
  requested_by_name: z.string(),
  description: z.string(),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime(),
});
export type ApprovalRequestPublic = z.infer<typeof ApprovalRequestPublicSchema>;

/** Result of a gated action attempt: either it executed now, or a request is
 * pending a family approver's decision. Lets the caller (e.g. the caregiver
 * unlink flow) tell the user "done" vs "waiting for approval". */
export const GatedActionResultSchema = z.object({
  executed: z.boolean(),
  status: z.nativeEnum(ApprovalStatus),
  approval_id: z.string().uuid().nullable(),
});
export type GatedActionResult = z.infer<typeof GatedActionResultSchema>;
