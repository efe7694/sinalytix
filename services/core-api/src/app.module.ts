import { Module } from '@nestjs/common';
import { DbModule } from './common/db.module';
import { RedisModule } from './common/redis.module';
import { AuthModule } from './auth/auth.module';
import { ConsentGrantsModule } from './consent-grants/consent-grants.module';
import { EmergencyContactsModule } from './emergency-contacts/emergency-contacts.module';
import { FamilyLinksModule } from './family-links/family-links.module';

@Module({
  imports: [DbModule, RedisModule, AuthModule, ConsentGrantsModule, EmergencyContactsModule, FamilyLinksModule],
})
export class AppModule {}
