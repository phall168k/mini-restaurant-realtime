import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { EntityManager, Repository } from 'typeorm';
import { BaseCrudService } from '../../../../libs/services/base-crud.service';
import { QueryFilters } from '../../../../libs/services/pagination/filter.helper';
import { handleError } from '../../../../libs/utils/handle-error.util';
import { OrderStatus } from '../../../../libs/enums/order-status.enum';
import { OrderItemStatus } from '../../../../libs/enums/order-item-status.enum';
import { PaymentStatus } from '../../../../libs/enums/payment-status.enum';
import { PaymentMethodEnum } from '../../../../libs/enums/payment-method.enum';
import { UserEntity } from '../../system/user/entities/user.entity';
import { OrderEntity } from '../order/entities/order.entity';
import { PaymentEntity } from './entities/payment.entity';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { CreatePaymentRequestDto } from './dto/create-payment-request.dto';
import { PaymentMapper } from './payment.mapper';
import { calculatePaymentTotals } from './payment-totals';

@Injectable()
export class PaymentService extends BaseCrudService<
  PaymentEntity,
  PaymentResponseDto
> {
  protected queryName = 'payment';
  protected SEARCH_FIELDS = ['paymentNo', 'referenceNo', 'order.orderNumber'];
  protected FILTER_FIELDS = ['paymentNo', 'referenceNo'];
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly repository: Repository<PaymentEntity>,
  ) {
    super();
  }
  protected getMapperResponseEntityFields() {
    return PaymentMapper.toDto;
  }
  protected getListQuery() {
    return this.repository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.order', 'order')
      .leftJoinAndSelect('payment.paidByUser', 'paidByUser');
  }
  protected getFilters(): QueryFilters<PaymentEntity> {
    const filters: QueryFilters<PaymentEntity> = {};
    for (const [field, values] of [
      ['paymentMethod', Object.values(PaymentMethodEnum)],
      ['paymentStatus', Object.values(PaymentStatus)],
    ] as const) {
      filters[field] = (query, value) => {
        if (!(values as readonly unknown[]).includes(value))
          throw new BadRequestException(`Invalid ${field}`);
        return query.andWhere(`payment.${field} = :${field}`, {
          [field]: value,
        });
      };
    }
    for (const field of ['orderId', 'paidByUserId']) {
      filters[field] = (query, value) => {
        const id =
          typeof value === 'number'
            ? value
            : typeof value === 'string' && /^\d+$/.test(value)
              ? Number(value)
              : NaN;
        if (!Number.isInteger(id) || id < 1 || id > 2147483647)
          throw new BadRequestException(`Invalid ${field}`);
        return query.andWhere(`payment.${field} = :${field}`, { [field]: id });
      };
    }
    return filters;
  }
  private async load(manager: EntityManager, id: number) {
    const payment = await manager.findOne(PaymentEntity, {
      where: { id },
      relations: {
        order: { table: true, items: { item: true } },
        paidByUser: true,
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }
  async findOne(id: number): Promise<PaymentResponseDto> {
    try {
      return await PaymentMapper.toDto(
        await this.load(this.repository.manager, id),
      );
    } catch (error) {
      handleError(error);
    }
  }

  // Lock the order before checking uniqueness and calculating its immutable payment snapshot.
  async create(
    dto: CreatePaymentRequestDto,
    paidByUserId: number,
  ): Promise<PaymentResponseDto> {
    try {
      return await this.repository.manager.transaction(async (manager) => {
        const locked = await manager.findOne(OrderEntity, {
          where: { id: dto.orderId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!locked) throw new NotFoundException('Order not found');
        if (
          await manager.findOne(PaymentEntity, {
            where: { orderId: dto.orderId },
            withDeleted: true,
          })
        ) {
          throw new ConflictException('This order already has a payment');
        }
        if (![OrderStatus.READY, OrderStatus.SERVED].includes(locked.status))
          throw new ConflictException('Only ready or served orders can be paid');
        if (!(await manager.findOneBy(UserEntity, { id: paidByUserId })))
          throw new NotFoundException('Paying user not found');
        const order = await manager.findOne(OrderEntity, {
          where: { id: dto.orderId },
          relations: { items: true },
        });
        if (!order) throw new NotFoundException('Order not found');
        if (
          order.items.some(
            (line) =>
              ![OrderItemStatus.READY, OrderItemStatus.SERVED, OrderItemStatus.CANCELED].includes(
                line.status,
              ),
          )
        ) {
          throw new ConflictException(
            'All non-canceled items must be ready or served before payment',
          );
        }
        const totals = calculatePaymentTotals(order, dto.receivedAmount);
        if (!Object.values(PaymentMethodEnum).includes(dto.paymentMethod))
          throw new BadRequestException('Invalid payment method');
        if (
          dto.paymentMethod !== PaymentMethodEnum.CASH &&
          totals.changeAmount !== '0.00'
        ) {
          throw new BadRequestException(
            'Non-cash payments must match the total exactly',
          );
        }
        const payment = await manager.save(
          PaymentEntity,
          manager.create(PaymentEntity, {
            paymentNo: `PAY-${randomUUID()}`,
            orderId: order.id,
            paymentMethod: dto.paymentMethod,
            paymentStatus: PaymentStatus.COMPLETED,
            ...totals,
            referenceNo: dto.referenceNo?.trim() || null,
            paidByUserId,
            attachment: dto.attachment ?? null,
          }),
        );
        await manager.update(
          OrderEntity,
          { id: order.id },
          { status: OrderStatus.PAID },
        );
        return PaymentMapper.toDto(await this.load(manager, payment.id));
      });
    } catch (error) {
      handleError(error);
    }
  }
}
