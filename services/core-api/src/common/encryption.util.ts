import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';

/**
 * AES-256-GCM column-level encryption for `totp_secrets.secret_encrypted`
 * (Module 1 §1.6: "hassas kolonlar... kolon-bazında ek şifrelenir"). Stands
 * in for real KMS envelope-encryption (Module 3 §8) until that's wired up —
 * same key-rotation-later shape, single env-var key for now.
 */
@Injectable()
export class ColumnEncryptionService {
  private readonly key: Buffer;

  constructor() {
    const b64 = process.env.COLUMN_ENCRYPTION_KEY;
    if (!b64) {
      throw new Error('COLUMN_ENCRYPTION_KEY is not set');
    }
    const key = Buffer.from(b64, 'base64');
    if (key.length !== 32) {
      throw new Error('COLUMN_ENCRYPTION_KEY must decode to exactly 32 bytes');
    }
    this.key = key;
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString('base64'), ciphertext.toString('base64'), authTag.toString('base64')].join('.');
  }

  decrypt(encoded: string): string {
    const [ivB64, ciphertextB64, authTagB64] = encoded.split('.');
    if (!ivB64 || !ciphertextB64 || !authTagB64) {
      throw new Error('Malformed encrypted value');
    }
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextB64, 'base64')),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  }
}
