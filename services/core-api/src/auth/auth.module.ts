import { Module } from '@nestjs/common';
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
})
export class AuthModule {}
