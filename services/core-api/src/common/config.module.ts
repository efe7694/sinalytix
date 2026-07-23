import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SystemConfigService } from './system-config.service';
import { RateLimitInterceptor } from './rate-limit.interceptor';

/**
 * Global so any module can inject `SystemConfigService` without listing it —
 * K10 means *every* service reads runtime constants from it, so wiring it
 * per-module would be pure ceremony (same reasoning as `DbModule`/`RedisModule`).
 */
@Global()
@Module({
  providers: [
    SystemConfigService,
    // Global, so a new module can't ship an unlimited endpoint by forgetting
    // to opt in — §1.5 is a property of the API surface, not of each route.
    // The SOS exemption lives inside the interceptor (see its doc comment),
    // not in a per-route decorator, for the same reason.
    { provide: APP_INTERCEPTOR, useClass: RateLimitInterceptor },
  ],
  exports: [SystemConfigService],
})
export class ConfigModule {}
