import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { MeController } from './me.controller';
import { AuthService } from './auth.service';
import { ProfileService } from './profile.service';
import { TokenService } from './token.service';
import { OtpService } from './otp.service';
import { TotpService } from './totp.service';
import { PasswordService } from './password.service';
import { AppleIdTokenVerifier, GoogleIdTokenVerifier } from './id-token-verifier';
import { ColumnEncryptionService } from '../common/encryption.util';
import { AuthContextGuard } from '../common/auth-context.guard';

// Global: AuthContextGuard is reused by every later domain module (Faz 1+)
// via `@UseGuards(AuthContextGuard)` outside AuthModule itself. Nest's guard
// resolution looks up the guard class within the consuming controller's own
// module scope, not just anywhere reachable via `imports` — plain
// export+import wasn't enough (verified: DI failed on TokenService when
// ConsentGrantsModule only imported AuthModule without this). @Global makes
// AuthModule's exports available everywhere without every feature module
// needing to import it, the standard fix for a cross-cutting auth guard.
@Global()
@Module({
  controllers: [AuthController, MeController],
  providers: [
    AuthService,
    ProfileService,
    TokenService,
    OtpService,
    TotpService,
    PasswordService,
    AppleIdTokenVerifier,
    GoogleIdTokenVerifier,
    ColumnEncryptionService,
    AuthContextGuard,
  ],
  exports: [AuthContextGuard, TokenService],
})
export class AuthModule {}
