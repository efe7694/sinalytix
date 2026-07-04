import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { AuthContext } from './auth-context.guard';

/** Reads the `AuthContext` attached by `AuthContextGuard`. Only usable on
 * routes guarded by it — guaranteed non-null there. */
export const CurrentAuth = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthContext => {
  const request = ctx.switchToHttp().getRequest<FastifyRequest>();
  if (!request.authContext) {
    throw new Error('CurrentAuth used on a route without AuthContextGuard');
  }
  return request.authContext;
});
