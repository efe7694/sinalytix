import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
  sub: string; // user_id
  session_id: string;
  app_context: string;
  roles: string[];
}

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // Module 2 §1.2: 15 dk

@Injectable()
export class TokenService {
  private readonly secret: string;

  constructor() {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not set');
    }
    this.secret = secret;
  }

  readonly accessTokenTtlSeconds = ACCESS_TOKEN_TTL_SECONDS;

  signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
  }

  /** Returns undefined for an invalid/expired token rather than throwing —
   * callers decide how to respond (always 401, never leak *why*). */
  verifyAccessToken(token: string): AccessTokenPayload | undefined {
    try {
      const decoded = jwt.verify(token, this.secret);
      if (typeof decoded === 'string') return undefined;
      const { sub, session_id, app_context, roles } = decoded as Record<string, unknown>;
      if (typeof sub !== 'string' || typeof session_id !== 'string' || typeof app_context !== 'string') {
        return undefined;
      }
      return { sub, session_id, app_context, roles: Array.isArray(roles) ? (roles as string[]) : [] };
    } catch {
      return undefined;
    }
  }
}
