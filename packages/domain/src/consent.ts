/**
 * ConsentRecord wire contract — Module 2 §3.2, Dictionary §2.
 * ConsentRecord is append-only; there is no update/patch contract.
 */

import { z } from 'zod';
import { AppContext, ConsentFlag, RecordedChannel } from './enums';

export const ConsentRecordFlagsSchema = z.record(z.nativeEnum(ConsentFlag), z.boolean());
export type ConsentRecordFlags = z.infer<typeof ConsentRecordFlagsSchema>;

export const CreateConsentRecordRequestSchema = z.object({
  app_context: z.nativeEnum(AppContext),
  version: z.string(),
  recorded_channel: z.nativeEnum(RecordedChannel),
  flags: ConsentRecordFlagsSchema,
  consented_at: z.string().datetime(),
  // HCP recording consent on behalf of an app-less patient (C17a).
  on_behalf_of_patient_id: z.string().uuid().optional(),
});
export type CreateConsentRecordRequest = z.infer<typeof CreateConsentRecordRequestSchema>;

export const ConsentRecordPublicSchema = z.object({
  consent_id: z.string().uuid(),
  server_recorded_at: z.string().datetime(),
});
export type ConsentRecordPublic = z.infer<typeof ConsentRecordPublicSchema>;
