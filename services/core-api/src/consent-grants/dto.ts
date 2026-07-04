import { z } from 'zod';
import { CreateConsentGrantRequestSchema, CreateSdmDeclarationRequestSchema } from '@sinalytix/domain';
import { CursorQuerySchema } from '@sinalytix/domain';

export { CreateConsentGrantRequestSchema, CreateSdmDeclarationRequestSchema, CursorQuerySchema };

export type CreateConsentGrantBody = z.infer<typeof CreateConsentGrantRequestSchema>;
export type CreateSdmDeclarationBody = z.infer<typeof CreateSdmDeclarationRequestSchema>;
