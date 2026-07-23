import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import type { GenerateFamilyLinkCodeResponse, LinkedPatientSummary, PatientFamilyLinkPublic } from '@sinalytix/domain';
import { AuthContextGuard } from '../common/auth-context.guard';
import { CurrentAuth } from '../common/current-auth.decorator';
import type { AuthContext } from '../common/auth-context.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { IdempotencyInterceptor } from '../common/idempotency.interceptor';
import { FamilyLinksService } from './family-links.service';
import { RedeemFamilyLinkRequestSchema, type RedeemFamilyLinkRequest } from './dto';
import {
  UpdateFamilyLinkPermissionRequestSchema,
  type UpdateFamilyLinkPermissionRequest,
} from '@sinalytix/domain';

/** Module 2 §3.4 — PatientFamilyLink + FamilyLinkCode (Faz 1 Slice 3). */
@Controller()
@UseGuards(AuthContextGuard)
export class FamilyLinksController {
  constructor(private readonly familyLinksService: FamilyLinksService) {}

  @Post('patients/:patientId/family-link-codes')
  @UseInterceptors(IdempotencyInterceptor)
  async generateCode(
    @Param('patientId') patientId: string,
    @CurrentAuth() auth: AuthContext,
  ): Promise<GenerateFamilyLinkCodeResponse> {
    return this.familyLinksService.generateCode(patientId, auth.userId);
  }

  @Delete('patients/:patientId/family-link-codes/active')
  @UseInterceptors(IdempotencyInterceptor)
  @HttpCode(204)
  async revokeCode(@Param('patientId') patientId: string, @CurrentAuth() auth: AuthContext): Promise<void> {
    await this.familyLinksService.revokeCode(patientId, auth.userId);
  }

  @Post('emergency-contacts/:ecId/invite')
  @UseInterceptors(IdempotencyInterceptor)
  async inviteEmergencyContact(
    @Param('ecId') ecId: string,
    @CurrentAuth() auth: AuthContext,
  ): Promise<GenerateFamilyLinkCodeResponse> {
    return this.familyLinksService.inviteEmergencyContact(ecId, auth.userId);
  }

  @Post('family-links/redeem')
  @UseInterceptors(IdempotencyInterceptor)
  async redeem(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(RedeemFamilyLinkRequestSchema)) body: RedeemFamilyLinkRequest,
  ): Promise<PatientFamilyLinkPublic> {
    return this.familyLinksService.redeem(auth.userId, body);
  }

  @Post('family-links/:linkId/confirm')
  @UseInterceptors(IdempotencyInterceptor)
  async confirm(@Param('linkId') linkId: string, @CurrentAuth() auth: AuthContext): Promise<PatientFamilyLinkPublic> {
    return this.familyLinksService.confirm(linkId, auth.userId);
  }

  /** FAM-13 permission change. Patient app only, and `full` is K6-gated —
   * see the service method. */
  @Patch('family-links/:linkId')
  @UseInterceptors(IdempotencyInterceptor)
  async updatePermission(
    @Param('linkId') linkId: string,
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(UpdateFamilyLinkPermissionRequestSchema)) body: UpdateFamilyLinkPermissionRequest,
  ): Promise<PatientFamilyLinkPublic> {
    return this.familyLinksService.updatePermission(linkId, auth.userId, auth.appContext, body.permission_level);
  }

  @Post('family-links/:linkId/unlink')
  @UseInterceptors(IdempotencyInterceptor)
  @HttpCode(204)
  async unlink(@Param('linkId') linkId: string, @CurrentAuth() auth: AuthContext): Promise<void> {
    await this.familyLinksService.revokeLink(linkId, auth.userId);
  }

  @Get('family/my-links')
  async myLinks(@CurrentAuth() auth: AuthContext): Promise<LinkedPatientSummary[]> {
    return this.familyLinksService.listMyLinks(auth.userId);
  }
}
