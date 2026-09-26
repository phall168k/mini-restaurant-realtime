import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    HealthModule,
    AdminModule, 
    AuthModule, RealtimeModule, 
  ]
})
export class ModulesModule {}
