import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEntity } from './entities/payment.entity';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { RealtimeModule } from '../../../realtime/realtime.module';
import { OrderModule } from '../order/order.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentEntity
    ]),
    RealtimeModule,
    OrderModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
