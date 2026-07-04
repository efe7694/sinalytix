import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import type { EmergencyContactPublic } from '@sinalytix/domain';
import { AuthContextGuard } from '../common/auth-context.guard';
import { CurrentAuth } from '../common/current-auth.decorator';
import type { AuthContext } from '../common/auth-context.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { IdempotencyInterceptor } from '../common/idempotency.interceptor';
import { EmergencyContactsService } from './emergency-contacts.service';
import {
  CreateEmergencyContactRequestSchema,
  ReorderEmergencyContactsRequestSchema,
  UpdateEmergencyContactRequestSchema,
  VerifyPhoneRequestSchema,
  type CreateEmergencyContactRequest,
  type ReorderEmergencyContactsRequest,
  type UpdateEmergencyContactRequest,
  type VerifyPhoneRequest,
} from './dto';

/** Module 2 §3.3 — EmergencyContact CRUD + phone-verify. */
@Controller()
@UseGuards(AuthContextGuard)
export class EmergencyContactsController {
  constructor(private readonly emergencyContactsService: EmergencyContactsService) {}

  @Post('patients/:patientId/emergency-contacts')
  @UseInterceptors(IdempotencyInterceptor)
  async create(
    @Param('patientId') patientId: string,
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(CreateEmergencyContactRequestSchema)) body: CreateEmergencyContactRequest,
  ): Promise<EmergencyContactPublic> {
    return this.emergencyContactsService.create(patientId, auth.userId, body);
  }

  @Get('patients/:patientId/emergency-contacts')
  async list(@Param('patientId') patientId: string, @CurrentAuth() auth: AuthContext): Promise<EmergencyContactPublic[]> {
    return this.emergencyContactsService.list(patientId, auth.userId);
  }

  @Patch('emergency-contacts/:ecId')
  @UseInterceptors(IdempotencyInterceptor)
  async update(
    @Param('ecId') ecId: string,
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(UpdateEmergencyContactRequestSchema)) body: UpdateEmergencyContactRequest,
  ): Promise<EmergencyContactPublic> {
    return this.emergencyContactsService.update(ecId, auth.userId, body);
  }

  @Delete('emergency-contacts/:ecId')
  @UseInterceptors(IdempotencyInterceptor)
  @HttpCode(204)
  async remove(@Param('ecId') ecId: string, @CurrentAuth() auth: AuthContext): Promise<void> {
    await this.emergencyContactsService.remove(ecId, auth.userId);
  }

  /** Judgment call (see DEVIATIONS.md): a batch reorder endpoint, not in
   * the literal API contract, kept because a single multi-row UPDATE is
   * what actually makes reordering into fixed 1-3 slots safe (see the
   * service's comment on the partial unique index). */
  @Post('patients/:patientId/emergency-contacts/reorder')
  @UseInterceptors(IdempotencyInterceptor)
  async reorder(
    @Param('patientId') patientId: string,
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(ReorderEmergencyContactsRequestSchema)) body: ReorderEmergencyContactsRequest,
  ): Promise<EmergencyContactPublic[]> {
    return this.emergencyContactsService.reorder(patientId, auth.userId, body.ordered_ids);
  }

  @Post('emergency-contacts/:ecId/verify-phone')
  @UseInterceptors(IdempotencyInterceptor)
  @HttpCode(200)
  async verifyPhone(
    @Param('ecId') ecId: string,
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(VerifyPhoneRequestSchema)) body: VerifyPhoneRequest,
  ): Promise<EmergencyContactPublic | { verification_pending: true }> {
    if (body.action === 'request_code') {
      await this.emergencyContactsService.requestPhoneVerification(ecId, auth.userId);
      return { verification_pending: true };
    }
    return this.emergencyContactsService.confirmPhoneVerification(ecId, auth.userId, body.code);
  }
}
