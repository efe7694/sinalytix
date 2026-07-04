import { Module } from '@nestjs/common';
import { DbModule } from './common/db.module';
import { RedisModule } from './common/redis.module';
import { AuthModule } from './auth/auth.module';
import { ConsentGrantsModule } from './consent-grants/consent-grants.module';

@Module({
  imports: [DbModule, RedisModule, AuthModule, ConsentGrantsModule],
})
export class AppModule {}
