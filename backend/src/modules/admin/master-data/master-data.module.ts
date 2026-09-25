import { Module } from '@nestjs/common';
import { ItemModule } from './item/item.module';
import { CategoryModule } from './category/category.module';

@Module({
  imports: [CategoryModule, ItemModule]
})
export class MasterDataModule {}
