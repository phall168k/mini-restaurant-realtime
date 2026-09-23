import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    HealthModule,
    AdminModule, 
    AuthModule, 
  ]
})
export class ModulesModule {}
