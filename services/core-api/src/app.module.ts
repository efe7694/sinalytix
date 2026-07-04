import { Module } from '@nestjs/common';
import { DbModule } from './common/db.module';
import { RedisModule } from './common/redis.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [DbModule, RedisModule, AuthModule],
})
export class AppModule {}
