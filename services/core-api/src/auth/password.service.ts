import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/** Argon2id, params per Module 1 §3.1 ("mem 64MB, iter 3, par 4") — HCP
 * email+password only; consumer apps use SSO/OTP. */
@Injectable()
export class PasswordService {
  private readonly options: argon2.Options & { type: typeof argon2.argon2id } = {
    type: argon2.argon2id,
    memoryCost: 65536, // KiB = 64MB
    timeCost: 3,
    parallelism: 4,
  };

  hash(password: string): Promise<string> {
    return argon2.hash(password, this.options);
  }

  verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }
}
