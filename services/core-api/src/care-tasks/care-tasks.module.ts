import { Module } from '@nestjs/common';
import { CareTasksController } from './care-tasks.controller';
import { CareTasksService } from './care-tasks.service';
import { OccurrencesService } from './occurrences.service';
import { IdempotencyService } from '../common/idempotency.service';
import { IdempotencyInterceptor } from '../common/idempotency.interceptor';

@Module({
  controllers: [CareTasksController],
  providers: [CareTasksService, OccurrencesService, IdempotencyService, IdempotencyInterceptor],
  // Exported: Faz 2 Slice 4's nightly generator and Faz 5's CarePlan →
  // CareTask materialization both drive the same engine.
  exports: [CareTasksService, OccurrencesService],
})
export class CareTasksModule {}
