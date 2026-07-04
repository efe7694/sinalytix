/**
 * RFC 7807 (application/problem+json) error contract — Module 2 §1.4.
 * Every core-api error response matches this shape exactly; PHI never
 * appears in `detail`/`errors[]` (Module 2 §7.2).
 */

import { z } from 'zod';

export const ProblemFieldErrorSchema = z.object({
  field: z.string(),
  code: z.string(),
  message: z.string(),
});
export type ProblemFieldError = z.infer<typeof ProblemFieldErrorSchema>;

export const ProblemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string(),
  trace_id: z.string(),
  errors: z.array(ProblemFieldErrorSchema).optional(),
});
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
