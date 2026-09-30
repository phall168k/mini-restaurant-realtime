import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { OrderEntity } from '../operation/order/entities/order.entity';
import { OrderItemEntity } from '../operation/order/entities/order-item.entity';
import { PaymentEntity } from '../operation/payment/entities/payment.entity';
import { RestaurantTableEntity } from '../master-data/restaurant-table/entities/restaurant-table.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity, OrderItemEntity, PaymentEntity, RestaurantTableEntity])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
