import { z } from 'zod';
import { E164PhoneSchema } from '@sinalytix/domain';

export const OtpRequestBodySchema = z.object({ phone_e164: E164PhoneSchema });
export const OtpVerifyBodySchema = z.object({ phone_e164: E164PhoneSchema, code: z.string().length(6) });
export const RefreshBodySchema = z.object({ refresh_token: z.string() });
export const TotpVerifyBodySchema = z.object({ code: z.string().length(6) });
export const MfaCompleteBodySchema = z.object({ mfa_token: z.string(), code: z.string().length(6) });
export const PatchMeBodySchema = z
  .object({
    locale: z.enum(['en', 'fr', 'tr']).optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    avatar_url: z.string().url().optional(),
    dnd: z.boolean().optional(),
    availability_status: z.enum(['available', 'unavailable', 'on_shift']).optional(),
  })
  .strict();

export type PatchMeBody = z.infer<typeof PatchMeBodySchema>;
