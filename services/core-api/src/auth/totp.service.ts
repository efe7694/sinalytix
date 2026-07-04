import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';

/** TOTP enrollment/verification (Module 1 §3.5, Module 2 §3.1) — HCP MFA. */
@Injectable()
export class TotpService {
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  otpauthUri(secret: string, accountLabel: string): string {
    return authenticator.keyuri(accountLabel, 'Sinalytix', secret);
  }

  verify(secret: string, code: string): boolean {
    return authenticator.check(code, secret);
  }
}
