import { PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { ApiException } from './api.exception';

/**
 * Validates a request body against a @sinalytix/domain zod schema and throws
 * the canonical `VALIDATION_FAILED` 422 envelope (Modül 2 §1.3) on failure.
 *
 * `details[].issue` carries zod's issue CODE (`invalid_type`, `too_small`),
 * deliberately not zod's human message and never the submitted value —
 * `details[]` is machine-readable and must stay PHI-free (Modül 2 §8), and
 * the human half of the response is the localized `message`.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw ApiException.validationFailed(
        result.error.issues.map((issue) => ({
          field: issue.path.join('.') || '(root)',
          issue: issue.code,
        })),
      );
    }
    return result.data;
  }
}
