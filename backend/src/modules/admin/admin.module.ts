import { Module } from '@nestjs/common';
import { SystemModule } from './system/system.module';
import { MasterDataModule } from './master-data/master-data.module';

@Module({
  imports: [SystemModule, MasterDataModule]
})
export class AdminModule {}
