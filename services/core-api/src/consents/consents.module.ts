import { Module } from '@nestjs/common';
import { ConsentsController } from './consents.controller';
import { ConsentsService } from './consents.service';
import { IdempotencyService } from '../common/idempotency.service';
import { IdempotencyInterceptor } from '../common/idempotency.interceptor';

@Module({
  controllers: [ConsentsController],
  providers: [ConsentsService, IdempotencyService, IdempotencyInterceptor],
  // Exported: the Modül 4 AI gate (B9 `ack_ai_processing`) and any future
  // onboarding gate need `hasFlag()` without re-deriving "latest record wins".
  exports: [ConsentsService],
})
export class ConsentsModule {}
