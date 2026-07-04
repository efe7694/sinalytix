import { Module } from '@nestjs/common';
import { EmergencyContactsController } from './emergency-contacts.controller';
import { EmergencyContactsService } from './emergency-contacts.service';
import { IdempotencyService } from '../common/idempotency.service';
import { IdempotencyInterceptor } from '../common/idempotency.interceptor';

@Module({
  controllers: [EmergencyContactsController],
  providers: [EmergencyContactsService, IdempotencyService, IdempotencyInterceptor],
  exports: [EmergencyContactsService],
})
export class EmergencyContactsModule {}
