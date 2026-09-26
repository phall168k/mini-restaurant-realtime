import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantTableEntity } from './entities/restaurant-table.entity';
import { Module } from '@nestjs/common';
import { RestaurantTableService } from './restaurant-table.service';
import { RestaurantTableController } from './restaurant-table.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RestaurantTableEntity])],
  controllers: [RestaurantTableController],
  providers: [RestaurantTableService],
})
export class RestaurantTableModule {}
