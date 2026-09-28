import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KitchenEntity } from './entities/kitchen.entity';
import { OrderItemEntity } from '../order/entities/order-item.entity';
import { UserEntity } from '../../system/user/entities/user.entity';
import { KitchenService } from './kitchen.service';
import { KitchenController } from './kitchen.controller';
@Module({
  imports: [
    TypeOrmModule.forFeature([KitchenEntity, OrderItemEntity, UserEntity]),
  ],
  controllers: [KitchenController],
  providers: [KitchenService],
  exports: [KitchenService],
})
export class KitchenModule {}
