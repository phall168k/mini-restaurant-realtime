import { Module } from '@nestjs/common';
import { OrderModule } from './order/order.module';
import { KitchenModule } from './kitchen/kitchen.module';
@Module({ imports: [OrderModule, KitchenModule] })
export class OperationModule {}
