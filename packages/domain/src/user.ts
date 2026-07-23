/**
 * Auth & identity wire contracts — Module 2 §3.1, Dictionary §1.
 * These describe the API request/response shapes (not raw DB rows —
 * see packages/db for table row types).
 */

import { z } from 'zod';
import { AppContext, AuthMethod, Locale, Platform, Role, UserStatus } from './enums';

/**
 * E.164 (Modül 1 §3.1 "`phone_e164` — E.164 normalize"). One definition,
 * because a second copy is a second chance to disagree: `/auth/otp/request`
 * used to accept `z.string().min(8)`, so any 8-character string could be
 * written into `phone_e164` while `EmergencyContact` enforced the real
 * format — found by the error-envelope test (D15/B1 slice).
 *
 * No zod `message` here: validation errors go out as `details[].issue` code
 * slugs and a localized top-level message (Modül 2 §1.3), so an inline
 * sentence would be dead text in exactly one language.
 */
export const E164PhoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/);


// ── /me — safe subset of `User` (Module 2 §3.1) ─────────

export const UserPublicSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().email().nullable(),
  email_verified: z.boolean(),
  phone_e164: z.string().nullable(),
  phone_verified: z.boolean(),
  locale: z.nativeEnum(Locale),
  roles: z.array(z.nativeEnum(Role)),
  status: z.nativeEnum(UserStatus),
});
export type UserPublic = z.infer<typeof UserPublicSchema>;

// Profile extensions returned alongside UserPublic, keyed by active app_context.
// Faz 0 exposes only the identity-bearing fields; domain-specific fields
// (e.g. PatientProfile.conditions_declared) are added when their owning
// phase migrates those columns.

export const PatientProfilePublicSchema = z.object({
  date_of_birth: z.string().date().nullable(),
  timezone_iana: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
});
export type PatientProfilePublic = z.infer<typeof PatientProfilePublicSchema>;

export const FamilyProfilePublicSchema = z.object({
  dnd: z.boolean(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
});
export type FamilyProfilePublic = z.infer<typeof FamilyProfilePublicSchema>;

export const CaregiverProfilePublicSchema = z.object({
  agency_id: z.string().uuid().nullable(),
  employee_id: z.string().nullable(),
  role: z.string(), // CaregiverRole — kept loose here, narrowed once caregiver_certifications lands
  availability_status: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
});
export type CaregiverProfilePublic = z.infer<typeof CaregiverProfilePublicSchema>;

// ── Session (Module 1 §3.5, Module 2 §3.1) ──────────────

export const SessionPublicSchema = z.object({
  session_id: z.string().uuid(),
  app_context: z.nativeEnum(AppContext),
  platform: z.nativeEnum(Platform),
  device_label: z.string().nullable(),
  created_at: z.string().datetime(),
  is_current: z.boolean(),
});
export type SessionPublic = z.infer<typeof SessionPublicSchema>;

// ── Auth flow request/response bodies ───────────────────

export const SignupRequestSchema = z.object({
  auth_method: z.nativeEnum(AuthMethod),
  app_context: z.nativeEnum(AppContext),
  id_token: z.string().optional(), // apple_sso / google_sso
  phone_e164: z.string().optional(), // phone_otp
  email: z.string().email().optional(), // email_password (HCP only)
  password: z.string().min(12).optional(),
});
export type SignupRequest = z.infer<typeof SignupRequestSchema>;

// Phone (`phone_otp`) is handled exclusively by /auth/otp/request+verify
// (find-or-create on verify) — /auth/login is for the synchronous methods
// where a returning user is looked up, not created.
export const LoginRequestSchema = z.object({
  auth_method: z.enum([AuthMethod.APPLE_SSO, AuthMethod.GOOGLE_SSO, AuthMethod.EMAIL_PASSWORD]),
  app_context: z.nativeEnum(AppContext),
  id_token: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const TokenPairSchema = z.object({
  access_token: z.string(),
  expires_in: z.number().int(),
  refresh_token: z.string(),
});
export type TokenPair = z.infer<typeof TokenPairSchema>;

// access_token/refresh_token/session are omitted entirely (not empty
// strings) when mfa_required is true — the client must call
// /auth/mfa/totp/verify with mfa_token before a real session exists.
export const AuthResultSchema = z.object({
  user_id: z.string().uuid(),
  status: z.nativeEnum(UserStatus),
  access_token: z.string().optional(),
  expires_in: z.number().int().optional(),
  refresh_token: z.string().optional(),
  session: z
    .object({
      session_id: z.string().uuid(),
      app_context: z.nativeEnum(AppContext),
      platform: z.nativeEnum(Platform),
    })
    .optional(),
  mfa_required: z.boolean().optional(),
  mfa_token: z.string().optional(),
});
export type AuthResult = z.infer<typeof AuthResultSchema>;

export const OtpRequestSchema = z.object({
  phone_e164: z.string(),
});
export type OtpRequest = z.infer<typeof OtpRequestSchema>;

export const OtpVerifySchema = z.object({
  phone_e164: z.string(),
  code: z.string().length(6),
});
export type OtpVerify = z.infer<typeof OtpVerifySchema>;

export const RefreshRequestSchema = z.object({
  refresh_token: z.string(),
});
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

export const TotpEnrollResultSchema = z.object({
  otpauth_uri: z.string(),
});
export type TotpEnrollResult = z.infer<typeof TotpEnrollResultSchema>;

export const TotpVerifySchema = z.object({
  code: z.string().length(6),
});
export type TotpVerify = z.infer<typeof TotpVerifySchema>;

export const BackupCodesResultSchema = z.object({
  codes: z.array(z.string()),
});
export type BackupCodesResult = z.infer<typeof BackupCodesResultSchema>;
