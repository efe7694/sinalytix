import { HttpException } from '@nestjs/common';
import type { ProblemFieldError } from '@sinalytix/domain';

export interface ProblemExceptionInit {
  type: string;
  title: string;
  status: number;
  detail: string;
  errors?: ProblemFieldError[];
}

/** RFC 7807 (application/problem+json) — Module 2 §1.4. */
export class ProblemException extends HttpException {
  readonly problemType: string;
  readonly problemErrors?: ProblemFieldError[];

  constructor(init: ProblemExceptionInit) {
    super({ title: init.title, detail: init.detail }, init.status);
    this.problemType = init.type;
    this.problemErrors = init.errors;
  }

  static badRequest(detail: string): ProblemException {
    return new ProblemException({
      type: 'https://api.sinalytix.ca/errors/bad-request',
      title: 'Bozuk istek',
      status: 400,
      detail,
    });
  }

  static unauthorized(detail: string): ProblemException {
    return new ProblemException({
      type: 'https://api.sinalytix.ca/errors/unauthorized',
      title: 'Kimlik doğrulama gerekli',
      status: 401,
      detail,
    });
  }

  static forbidden(detail: string): ProblemException {
    return new ProblemException({
      type: 'https://api.sinalytix.ca/errors/forbidden',
      title: 'İşlem yasak',
      status: 403,
      detail,
    });
  }

  static notFound(detail = 'Kayıt bulunamadı.'): ProblemException {
    return new ProblemException({
      type: 'https://api.sinalytix.ca/errors/not-found',
      title: 'Bulunamadı',
      status: 404,
      detail,
    });
  }

  static conflict(detail: string): ProblemException {
    return new ProblemException({
      type: 'https://api.sinalytix.ca/errors/conflict',
      title: 'Çakışma',
      status: 409,
      detail,
    });
  }

  static validation(errors: ProblemFieldError[]): ProblemException {
    return new ProblemException({
      type: 'https://api.sinalytix.ca/errors/validation',
      title: 'Doğrulama hatası',
      status: 422,
      detail: `${errors.length} alan geçersiz.`,
      errors,
    });
  }

  static tooManyRequests(detail: string): ProblemException {
    return new ProblemException({
      type: 'https://api.sinalytix.ca/errors/rate-limited',
      title: 'Çok fazla istek',
      status: 429,
      detail,
    });
  }
}
