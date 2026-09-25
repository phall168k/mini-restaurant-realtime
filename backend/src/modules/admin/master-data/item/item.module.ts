import { CategoryEntity } from '../category/entities/category.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemEntity } from './entities/item.entity';
import { Module } from '@nestjs/common';
import { ItemService } from './item.service';
import { ItemController } from './item.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ItemEntity, 
      CategoryEntity,
    ]),
  ],
  controllers: [ItemController],
  providers: [ItemService],
})
export class ItemModule {}
