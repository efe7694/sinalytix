import { createHash, randomBytes } from 'node:crypto';

/** SHA-256 hex digest — used for ip/ua/device-fp hashing (Module 1 §1.6) and
 * for hashing opaque secrets (refresh tokens, OTP/backup codes, recovery
 * tokens) before they touch the database. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Cryptographically random opaque token, URL-safe. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** 6-digit numeric OTP code (Module 2 §3.1 worked example: "914208"). */
export function randomOtpCode(): string {
  const n = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return n.toString().padStart(6, '0');
}
