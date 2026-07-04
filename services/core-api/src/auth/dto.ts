import { z } from 'zod';

export const OtpRequestBodySchema = z.object({ phone_e164: z.string().min(8) });
export const OtpVerifyBodySchema = z.object({ phone_e164: z.string().min(8), code: z.string().length(6) });
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
