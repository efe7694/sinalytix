import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { checkIdentity } from '@sinalytix/policy-engine';
import type { Kysely } from 'kysely';
import type { Database } from '@sinalytix/db';
import { withRlsContext } from '@sinalytix/db';
import { KYSELY } from './db.module';
import { ApiException } from './api.exception';
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
      throw ApiException.unauthenticated('auth.access_token_missing');
    }
    const payload = this.tokenService.verifyAccessToken(authHeader.slice('Bearer '.length));
    if (!payload) {
      throw ApiException.unauthenticated('auth.access_token_invalid');
    }

    const requestAppContext = request.headers['x-app-context'];
    if (typeof requestAppContext !== 'string' || requestAppContext.length === 0) {
      throw ApiException.badRequest('request.app_context_header_required');
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
      throw ApiException.unauthenticated('auth.session_invalid');
    }

    const decision = checkIdentity(
      { userStatus: resolved.user.status, sessionAppContext: resolved.session.app_context },
      { requestAppContext },
    );
    if (decision.decision === 'deny') {
      // PolicyEngine reasons are internal rule ids, not user-facing text —
      // map them to the canonical wire codes so a client can branch (Modül 2
      // §1.3). `app_context_mismatch` has its own code precisely because the
      // client's correct reaction differs: sign in from the right app, not
      // "you lack permission".
      throw decision.reasons.includes('app_context_mismatch')
        ? ApiException.appContextMismatch()
        : ApiException.permissionDenied('error.permission_denied', [
            { field: 'session', issue: decision.reasons[0] ?? 'denied' },
          ]);
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
