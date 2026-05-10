/**
 * User-related types shared across all apps.
 */

import { z } from 'zod';
import { AuthMethod, UserRole, UserStatus } from './enums';

// ── Zod Schemas ──────────────────────────────────────────

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  display_name: z.string().nullable(),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus),
  auth_method: z.nativeEnum(AuthMethod).nullable(),
  locale: z.string(),
  onboarding_completed: z.boolean(),
  created_at: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

// ── Onboarding Draft (stored locally before auth) ────────

export const OnboardingDraftSchema = z.object({
  step_progress: z.enum([
    'intro',
    'language',
    'consent',
    'ec',
    'seed',
    'auth_method',
    'auth',
    'done',
  ]),
  language: z.string().optional(),
  consent: z
    .object({
      accept_tos: z.boolean(),
      accept_privacy: z.boolean(),
      ack_not_emergency: z.boolean(),
      consented_at: z.string().datetime().optional(),
    })
    .optional(),
  emergency_contact: z
    .object({
      name: z.string(),
      relationship: z.string(),
      phone: z.string(),
      verified: z.literal(false),
    })
    .optional(),
  health_seed: z
    .object({
      conditions: z.array(z.string()),
      allergy_flag: z.enum(['yes', 'no', 'unknown']),
      allergy_notes: z.string().nullable(),
      source: z.literal('self_declared'),
    })
    .optional(),
});

export type OnboardingDraft = z.infer<typeof OnboardingDraftSchema>;
