import { PaymentEntity } from './entities/payment.entity';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { OrderMapper } from '../order/order.mapper';

export class PaymentMapper {
  static async toDto(entity: PaymentEntity): Promise<PaymentResponseDto> {
    return Object.assign(new PaymentResponseDto(), {
      id: entity.id,
      paymentNo: entity.paymentNo,
      orderId: entity.orderId,
      order: entity.order ? await OrderMapper.toDto(entity.order) : null,
      paymentMethod: entity.paymentMethod,
      paymentStatus: entity.paymentStatus,
      subTotal: entity.subTotal,
      discount: entity.discount,
      total: entity.total,
      receivedAmount: entity.receivedAmount,
      changeAmount: entity.changeAmount,
      referenceNo: entity.referenceNo,
      paidByUserId: entity.paidByUserId,
      paidByUser: entity.paidByUser
        ? { id: entity.paidByUser.id, username: entity.paidByUser.username }
        : null,
      attachment: entity.attachment,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
