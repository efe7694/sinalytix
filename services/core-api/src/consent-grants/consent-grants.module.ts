import { Module } from '@nestjs/common';
import { ConsentGrantsController } from './consent-grants.controller';
import { ConsentGrantsService } from './consent-grants.service';
import { IdempotencyService } from '../common/idempotency.service';
import { IdempotencyInterceptor } from '../common/idempotency.interceptor';

// AuthContextGuard doesn't need to be imported here — AuthModule is @Global.
@Module({
  controllers: [ConsentGrantsController],
  providers: [ConsentGrantsService, IdempotencyService, IdempotencyInterceptor],
  exports: [ConsentGrantsService],
})
export class ConsentGrantsModule {}
