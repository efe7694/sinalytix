import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import type { SessionPublic, UserPublic } from '@sinalytix/domain';
import { AuthContextGuard } from '../common/auth-context.guard';
import { CurrentAuth } from '../common/current-auth.decorator';
import type { AuthContext } from '../common/auth-context.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import { ProfileService } from './profile.service';
import { PatchMeBodySchema, type PatchMeBody } from './dto';

/** Module 2 §3.1 `/me` + `/me/sessions` — top-level, not under `/auth`. */
@Controller('me')
@UseGuards(AuthContextGuard)
export class MeController {
  constructor(
    private readonly authService: AuthService,
    private readonly profileService: ProfileService,
  ) {}

  @Get()
  async getMe(@CurrentAuth() auth: AuthContext): Promise<{ user: UserPublic; profile: Record<string, unknown> | null }> {
    return this.profileService.getMe(auth);
  }

  @Patch()
  @HttpCode(204)
  async patchMe(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(PatchMeBodySchema)) body: PatchMeBody,
  ): Promise<void> {
    await this.profileService.patchMe(auth, body);
  }

  @Get('sessions')
  async listSessions(@CurrentAuth() auth: AuthContext): Promise<SessionPublic[]> {
    return this.authService.listSessions(auth.userId, auth.sessionId);
  }

  @Post('sessions/:sessionId/revoke')
  @HttpCode(204)
  async revokeSession(@CurrentAuth() auth: AuthContext, @Param('sessionId') sessionId: string): Promise<void> {
    await this.authService.revokeSession(auth.userId, sessionId);
  }
}
