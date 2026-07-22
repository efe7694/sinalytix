import { Module } from '@nestjs/common';
import { DbModule } from './common/db.module';
import { RedisModule } from './common/redis.module';
import { ConfigModule } from './common/config.module';
import { AuthModule } from './auth/auth.module';
import { ConsentGrantsModule } from './consent-grants/consent-grants.module';
import { EmergencyContactsModule } from './emergency-contacts/emergency-contacts.module';
import { FamilyLinksModule } from './family-links/family-links.module';
import { CaregiverLinksModule } from './caregiver-links/caregiver-links.module';
import { ApprovalRequestsModule } from './approval-requests/approval-requests.module';

@Module({
  imports: [
    DbModule,
    RedisModule,
    ConfigModule,
    AuthModule,
    ConsentGrantsModule,
    EmergencyContactsModule,
    FamilyLinksModule,
    CaregiverLinksModule,
    ApprovalRequestsModule,
  ],
})
export class AppModule {}
