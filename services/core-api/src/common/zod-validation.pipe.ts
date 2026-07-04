import { PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { ProblemException } from './problem.exception';

/** Validates a request body against a @sinalytix/domain zod schema, throwing
 * the RFC 7807 `422` shape (Module 2 §1.4) on failure. */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw ProblemException.validation(
        result.error.issues.map((issue) => ({
          field: issue.path.join('.') || '(root)',
          code: issue.code,
          message: issue.message,
        })),
      );
    }
    return result.data;
  }
}
