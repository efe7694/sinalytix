import { Body, Controller, Get, HttpCode, Param, Patch, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { resolveLocale } from '@sinalytix/i18n';
import type { ApprovalRequestPublic, PatientApprovalConfigPublic } from '@sinalytix/domain';
import { AuthContextGuard } from '../common/auth-context.guard';
import { CurrentAuth } from '../common/current-auth.decorator';
import type { AuthContext } from '../common/auth-context.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { IdempotencyInterceptor } from '../common/idempotency.interceptor';
import { ApprovalRequestsService } from './approval-requests.service';
import { UpdateApprovalConfigRequestSchema, type UpdateApprovalConfigRequest } from './dto';

/** Module 3 — ApprovalRequest + PatientApprovalConfig (Faz 1 Slice 5). */
@Controller()
@UseGuards(AuthContextGuard)
export class ApprovalRequestsController {
  constructor(private readonly approvalRequestsService: ApprovalRequestsService) {}

  @Get('patients/:patientId/approval-config')
  async listConfig(@Param('patientId') patientId: string, @CurrentAuth() auth: AuthContext): Promise<PatientApprovalConfigPublic[]> {
    return this.approvalRequestsService.listConfig(patientId, auth.userId);
  }

  // PATCH (not PUT — no PUT in V0): upsert one action_type's setting.
  @Patch('patients/:patientId/approval-config')
  @UseInterceptors(IdempotencyInterceptor)
  async upsertConfig(
    @Param('patientId') patientId: string,
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(UpdateApprovalConfigRequestSchema)) body: UpdateApprovalConfigRequest,
  ): Promise<PatientApprovalConfigPublic> {
    return this.approvalRequestsService.upsertConfig(patientId, auth.userId, body);
  }

  @Get('patients/:patientId/approvals')
  async list(
    @Param('patientId') patientId: string,
    @CurrentAuth() auth: AuthContext,
    @Req() req: FastifyRequest,
  ): Promise<ApprovalRequestPublic[]> {
    // `description` is rendered server-side (one mapper for three apps, D14),
    // so the locale has to come from the request — otherwise a French family
    // member reads Turkish on the screen where misreading costs the most.
    return this.approvalRequestsService.listForPatient(
      patientId,
      auth.userId,
      resolveLocale(req.headers['accept-language']),
    );
  }

  @Post('approvals/:approvalId/approve')
  @UseInterceptors(IdempotencyInterceptor)
  @HttpCode(204)
  async approve(@Param('approvalId') approvalId: string, @CurrentAuth() auth: AuthContext): Promise<void> {
    await this.approvalRequestsService.decide(approvalId, auth.userId, 'approved');
  }

  @Post('approvals/:approvalId/reject')
  @UseInterceptors(IdempotencyInterceptor)
  @HttpCode(204)
  async reject(@Param('approvalId') approvalId: string, @CurrentAuth() auth: AuthContext): Promise<void> {
    await this.approvalRequestsService.decide(approvalId, auth.userId, 'rejected');
  }
}
