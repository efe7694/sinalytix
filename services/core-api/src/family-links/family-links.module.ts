import { Module } from '@nestjs/common';
import { FamilyLinksController } from './family-links.controller';
import { FamilyLinksService } from './family-links.service';
import { IdempotencyService } from '../common/idempotency.service';
import { IdempotencyInterceptor } from '../common/idempotency.interceptor';
import { RedeemRateLimiter } from '../common/redeem-rate-limiter.service';
import { ConsentGrantsModule } from '../consent-grants/consent-grants.module';

@Module({
  imports: [ConsentGrantsModule],
  controllers: [FamilyLinksController],
  providers: [FamilyLinksService, IdempotencyService, IdempotencyInterceptor, RedeemRateLimiter],
  exports: [FamilyLinksService],
})
export class FamilyLinksModule {}
