import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface VerifiedIdentity {
  /** Stable subject identifier from the provider — used to find-or-create the User. */
  subject: string;
  email?: string;
}

export interface IdTokenVerifier {
  verify(idToken: string): Promise<VerifiedIdentity>;
}

/**
 * Real JWKS-based verification (Module 2 §3.1: apple_sso/google_sso). Not
 * end-to-end testable in this environment without a live device producing a
 * real signed token — automated tests substitute a fake `IdTokenVerifier`
 * (see test/auth.flow.test.ts) and exercise the rest of the signup/login
 * flow around it. This class itself is exercised manually against a real
 * client before shipping.
 */
@Injectable()
export class AppleIdTokenVerifier implements IdTokenVerifier {
  private readonly jwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

  async verify(idToken: string): Promise<VerifiedIdentity> {
    const bundleId = process.env.APPLE_BUNDLE_ID;
    if (!bundleId) {
      throw new Error('APPLE_BUNDLE_ID is not set');
    }
    const { payload } = await jwtVerify(idToken, this.jwks, {
      issuer: 'https://appleid.apple.com',
      audience: bundleId,
    });
    return { subject: String(payload.sub), email: typeof payload.email === 'string' ? payload.email : undefined };
  }
}

@Injectable()
export class GoogleIdTokenVerifier implements IdTokenVerifier {
  private readonly jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

  async verify(idToken: string): Promise<VerifiedIdentity> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID is not set');
    }
    const { payload } = await jwtVerify(idToken, this.jwks, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
    });
    return { subject: String(payload.sub), email: typeof payload.email === 'string' ? payload.email : undefined };
  }
}
