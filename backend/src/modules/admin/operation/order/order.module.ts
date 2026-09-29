import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { RealtimeModule } from '../../../realtime/realtime.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity, 
      OrderItemEntity
    ]),
    RealtimeModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
