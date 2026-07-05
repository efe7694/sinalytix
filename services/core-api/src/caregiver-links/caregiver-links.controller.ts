import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import type { GatedActionResult, GenerateCaregiverLinkCodeResponse, LinkedPatientForCaregiver } from '@sinalytix/domain';
import { AuthContextGuard } from '../common/auth-context.guard';
import { CurrentAuth } from '../common/current-auth.decorator';
import type { AuthContext } from '../common/auth-context.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { IdempotencyInterceptor } from '../common/idempotency.interceptor';
import { CaregiverLinksService } from './caregiver-links.service';
import { RedeemCaregiverLinkRequestSchema, type RedeemCaregiverLinkRequest } from './dto';

/** Module 2 §3.4 — CaregiverLink (Faz 1 Slice 4, LINK_01). */
@Controller()
@UseGuards(AuthContextGuard)
export class CaregiverLinksController {
  constructor(private readonly caregiverLinksService: CaregiverLinksService) {}

  @Post('patients/:patientId/caregiver-links')
  @UseInterceptors(IdempotencyInterceptor)
  async generateCode(
    @Param('patientId') patientId: string,
    @CurrentAuth() auth: AuthContext,
  ): Promise<GenerateCaregiverLinkCodeResponse> {
    return this.caregiverLinksService.generateCode(patientId, auth.userId);
  }

  @Delete('patients/:patientId/caregiver-links/active')
  @UseInterceptors(IdempotencyInterceptor)
  @HttpCode(204)
  async revokeCode(@Param('patientId') patientId: string, @CurrentAuth() auth: AuthContext): Promise<void> {
    await this.caregiverLinksService.revokeCode(patientId, auth.userId);
  }

  @Post('caregiver-links/redeem')
  @UseInterceptors(IdempotencyInterceptor)
  async redeem(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(RedeemCaregiverLinkRequestSchema)) body: RedeemCaregiverLinkRequest,
  ): Promise<LinkedPatientForCaregiver> {
    return this.caregiverLinksService.redeem(auth.userId, body);
  }

  // Returns the gate result (200) rather than 204: a caregiver-initiated
  // unlink may be `executed: false, status: 'pending'` (awaiting a family
  // approval) instead of taking effect immediately.
  @Post('caregiver-links/:linkId/unlink')
  @UseInterceptors(IdempotencyInterceptor)
  async unlink(@Param('linkId') linkId: string, @CurrentAuth() auth: AuthContext): Promise<GatedActionResult> {
    return this.caregiverLinksService.unlink(linkId, auth.userId);
  }

  @Get('caregiver/my-patients')
  async myPatients(@CurrentAuth() auth: AuthContext): Promise<LinkedPatientForCaregiver[]> {
    return this.caregiverLinksService.listMyPatients(auth.userId);
  }
}
