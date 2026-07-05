import { Module } from '@nestjs/common';
import { ApprovalRequestsController } from './approval-requests.controller';
import { ApprovalRequestsService } from './approval-requests.service';
import { ApprovalGateService } from './approval-gate.service';
import { IdempotencyService } from '../common/idempotency.service';
import { IdempotencyInterceptor } from '../common/idempotency.interceptor';

@Module({
  controllers: [ApprovalRequestsController],
  providers: [ApprovalRequestsService, ApprovalGateService, IdempotencyService, IdempotencyInterceptor],
  // ApprovalGateService is exported so domain modules (e.g. caregiver-links)
  // can gate their sensitive actions through it.
  exports: [ApprovalGateService],
})
export class ApprovalRequestsModule {}
