import { Module } from '@nestjs/common';
import { CaregiverLinksController } from './caregiver-links.controller';
import { CaregiverLinksService } from './caregiver-links.service';
import { IdempotencyService } from '../common/idempotency.service';
import { IdempotencyInterceptor } from '../common/idempotency.interceptor';
import { RedeemRateLimiter } from '../common/redeem-rate-limiter.service';

@Module({
  controllers: [CaregiverLinksController],
  providers: [CaregiverLinksService, IdempotencyService, IdempotencyInterceptor, RedeemRateLimiter],
  exports: [CaregiverLinksService],
})
export class CaregiverLinksModule {}
