import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Req } from '@nestjs/common';
import {
  LoginRequestSchema,
  SignupRequestSchema,
  type AuthResult,
  type BackupCodesResult,
  type TokenPair,
  type TotpEnrollResult,
} from '@sinalytix/domain';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthContextGuard } from '../common/auth-context.guard';
import { CurrentAuth } from '../common/current-auth.decorator';
import type { AuthContext } from '../common/auth-context.guard';
import { sha256Hex } from '../common/hash.util';
import { AuthService, type RequestMeta } from './auth.service';
import {
  MfaCompleteBodySchema,
  OtpRequestBodySchema,
  OtpVerifyBodySchema,
  RefreshBodySchema,
  TotpVerifyBodySchema,
} from './dto';

function requestMeta(req: FastifyRequest): RequestMeta {
  const platform = req.headers['x-platform'];
  const ua = req.headers['user-agent'];
  return {
    platform: typeof platform === 'string' ? platform : 'mobile_ios',
    uaHash: ua ? sha256Hex(ua) : undefined,
    ipHash: req.ip ? sha256Hex(req.ip) : undefined,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body(new ZodValidationPipe(SignupRequestSchema)) body: unknown, @Req() req: FastifyRequest): Promise<AuthResult> {
    return this.authService.signup(body as never, requestMeta(req));
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body(new ZodValidationPipe(LoginRequestSchema)) body: unknown, @Req() req: FastifyRequest): Promise<AuthResult> {
    return this.authService.login(body as never, requestMeta(req));
  }

  @Post('otp/request')
  @HttpCode(202)
  async otpRequest(@Body(new ZodValidationPipe(OtpRequestBodySchema)) body: { phone_e164: string }): Promise<void> {
    await this.authService.requestOtp(body.phone_e164);
  }

  @Post('otp/verify')
  @HttpCode(200)
  async otpVerify(
    @Body(new ZodValidationPipe(OtpVerifyBodySchema.extend({ app_context: SignupRequestSchema.shape.app_context })))
    body: { phone_e164: string; code: string; app_context: string },
    @Req() req: FastifyRequest,
  ): Promise<AuthResult> {
    return this.authService.verifyOtp(body.phone_e164, body.code, body.app_context, requestMeta(req));
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body(new ZodValidationPipe(RefreshBodySchema)) body: { refresh_token: string }): Promise<TokenPair> {
    return this.authService.refresh(body.refresh_token);
  }

  @Post('logout')
  @UseGuards(AuthContextGuard)
  @HttpCode(204)
  async logout(@CurrentAuth() auth: AuthContext): Promise<void> {
    await this.authService.logout(auth.userId, auth.sessionId);
  }

  @Post('mfa/totp/enroll')
  @UseGuards(AuthContextGuard)
  async totpEnroll(@CurrentAuth() auth: AuthContext): Promise<TotpEnrollResult> {
    return this.authService.totpEnroll(auth.userId);
  }

  @Post('mfa/totp/verify')
  @UseGuards(AuthContextGuard)
  @HttpCode(204)
  async totpVerify(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(TotpVerifyBodySchema)) body: { code: string },
  ): Promise<void> {
    await this.authService.totpConfirm(auth.userId, body.code);
  }

  /** Mid-login MFA challenge completion (mfa_token from /auth/login) —
   * distinct from totpVerify above, which confirms a fresh enrollment for an
   * already-authenticated user. See DEVIATIONS.md on the mfa_token contract. */
  @Post('mfa/totp/complete')
  @HttpCode(200)
  async totpComplete(
    @Body(new ZodValidationPipe(MfaCompleteBodySchema)) body: { mfa_token: string; code: string },
    @Req() req: FastifyRequest,
  ): Promise<AuthResult> {
    return this.authService.completeMfaLogin(body.mfa_token, body.code, requestMeta(req));
  }

  @Post('mfa/backup-codes')
  @UseGuards(AuthContextGuard)
  async backupCodes(@CurrentAuth() auth: AuthContext): Promise<BackupCodesResult> {
    return this.authService.generateBackupCodes(auth.userId);
  }
}
