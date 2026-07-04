import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ProblemDetails } from '@sinalytix/domain';
import { ProblemException } from './problem.exception';

/**
 * Every error response is RFC 7807 (Module 2 §1.4). `detail`/`errors[]` never
 * carry PHI (Module 2 §7.2); unexpected errors are logged server-side with
 * the trace_id but the client only ever sees a generic message.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ProblemDetailsFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const traceId = request.id;

    if (exception instanceof ProblemException) {
      const response = exception.getResponse() as { title: string; detail: string };
      const body: ProblemDetails = {
        type: exception.problemType,
        title: response.title,
        status: exception.getStatus(),
        detail: response.detail,
        trace_id: String(traceId),
        errors: exception.problemErrors,
      };
      reply.status(exception.getStatus()).send(body);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body: ProblemDetails = {
        type: `https://api.sinalytix.ca/errors/http-${status}`,
        title: exception.name,
        status,
        detail: exception.message,
        trace_id: String(traceId),
      };
      reply.status(status).send(body);
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : exception, undefined, `trace_id=${traceId}`);
    const body: ProblemDetails = {
      type: 'https://api.sinalytix.ca/errors/internal',
      title: 'Beklenmeyen hata',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'Bir şeyler ters gitti. Sorun devam ederse destek ile iletişime geçin.',
      trace_id: String(traceId),
    };
    reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send(body);
  }
}
