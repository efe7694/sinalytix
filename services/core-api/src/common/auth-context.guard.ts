import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { checkIdentity } from '@sinalytix/policy-engine';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import { withRlsContext } from '@sinalytix/db';
import { KYSELY } from './db.module';
import { ProblemException } from './problem.exception';
import { TokenService } from '../auth/token.service';

export interface AuthContext {
  userId: string;
  sessionId: string;
  appContext: string;
  roles: string[];
  userStatus: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    authContext?: AuthContext;
  }
}

/**
 * Resolves the bearer access token + `X-App-Context` header into an
 * `AuthContext` for protected routes (Module 2 §1.2, §1.3). Runs
 * PolicyEngine step 1 (app-context match + user-status check) and rejects
 * before the route handler runs anything RLS-protected.
 */
@Injectable()
export class AuthContextGuard implements CanActivate {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    private readonly tokenService: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw ProblemException.unauthorized('Erişim jetonu eksik.');
    }
    const payload = this.tokenService.verifyAccessToken(authHeader.slice('Bearer '.length));
    if (!payload) {
      throw ProblemException.unauthorized('Erişim jetonu geçersiz veya süresi dolmuş.');
    }

    const requestAppContext = request.headers['x-app-context'];
    if (typeof requestAppContext !== 'string' || requestAppContext.length === 0) {
      throw ProblemException.badRequest('X-App-Context header zorunlu.');
    }

    const resolved = await withRlsContext(this.db, { actingUserId: payload.sub }, async (trx) => {
      const session = await trx
        .selectFrom('sessions')
        .select(['session_id', 'user_id', 'app_context', 'revoked_at'])
        .where('session_id', '=', payload.session_id)
        .executeTakeFirst();
      const user = await trx
        .selectFrom('users')
        .select(['status', 'roles'])
        .where('user_id', '=', payload.sub)
        .executeTakeFirst();
      return { session, user };
    });

    if (!resolved.session || resolved.session.revoked_at || !resolved.user) {
      throw ProblemException.unauthorized('Oturum geçersiz veya sonlandırılmış.');
    }

    const decision = checkIdentity(
      { userStatus: resolved.user.status, sessionAppContext: resolved.session.app_context },
      { requestAppContext },
    );
    if (decision.decision === 'deny') {
      throw ProblemException.forbidden(decision.reasons.join(','));
    }

    request.authContext = {
      userId: payload.sub,
      sessionId: payload.session_id,
      appContext: resolved.session.app_context,
      roles: resolved.user.roles,
      userStatus: resolved.user.status,
    };
    return true;
  }
}
