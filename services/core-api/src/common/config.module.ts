import { Global, Module } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';

/**
 * Global so any module can inject `SystemConfigService` without listing it —
 * K10 means *every* service reads runtime constants from it, so wiring it
 * per-module would be pure ceremony (same reasoning as `DbModule`/`RedisModule`).
 */
@Global()
@Module({
  providers: [SystemConfigService],
  exports: [SystemConfigService],
})
export class ConfigModule {}
