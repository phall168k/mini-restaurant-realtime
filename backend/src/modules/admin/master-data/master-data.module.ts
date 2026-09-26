import { Module } from '@nestjs/common';
import { ItemModule } from './item/item.module';
import { RestaurantTableModule } from './restaurant-table/restaurant-table.module';
import { CategoryModule } from './category/category.module';

@Module({
  imports: [CategoryModule, ItemModule, RestaurantTableModule]
})
export class MasterDataModule {}
