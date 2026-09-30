import { Module } from '@nestjs/common';
import { SystemModule } from './system/system.module';
import { MasterDataModule } from './master-data/master-data.module';
import { OperationModule } from './operation/operation.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [SystemModule, MasterDataModule, OperationModule, DashboardModule]
})
export class AdminModule {}
