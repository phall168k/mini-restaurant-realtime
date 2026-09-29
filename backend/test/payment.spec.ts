import { describe, expect, it, jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { PaymentService } from '../src/modules/admin/operation/payment/payment.service';
import { PaymentEntity } from '../src/modules/admin/operation/payment/entities/payment.entity';
import { OrderEntity } from '../src/modules/admin/operation/order/entities/order.entity';
import { OrderStatus } from '../src/libs/enums/order-status.enum';
import { OrderItemStatus } from '../src/libs/enums/order-item-status.enum';
import { PaymentMethodEnum } from '../src/libs/enums/payment-method.enum';

function setup(status: OrderStatus, lineStatus = OrderItemStatus.READY, duplicate = false) {
  const order = { id: 1, status, discount: '1.00', items: [
    { id: 1, quantity: 2, unitPrice: '10.00', discount: '0.50', status: lineStatus },
    { id: 2, quantity: 1, unitPrice: '100.00', discount: '0.00', status: OrderItemStatus.CANCELED },
  ] };
  let saved: object = {};
  const manager = {
    findOne: jest.fn(async (entity: unknown, options: { withDeleted?: boolean }) => {
      if (entity === OrderEntity) return order;
      if (options.withDeleted) return duplicate ? { id: 2 } : null;
      return { ...saved, order, paidByUser: { id: 3, username: 'cashier' } };
    }),
    findOneBy: jest.fn(async () => ({ id: 3 })),
    create: (_entity: unknown, data: object) => data,
    save: jest.fn(async (_entity: unknown, data: object) => { saved = { id: 2, ...data }; return saved; }),
    update: jest.fn(async () => ({ affected: 1 })),
  };
  const repository = { manager: { transaction: async (work: (manager: unknown) => unknown) => work(manager) } };
  return { service: new PaymentService(repository as unknown as Repository<PaymentEntity>), manager };
}
const form = { orderId: 1, paymentMethod: PaymentMethodEnum.CASH, receivedAmount: '20.00' };
describe('Payment eligibility and amounts', () => {
  it.each([OrderStatus.READY, OrderStatus.SERVED])('pays %s orders and excludes canceled lines', async status => {
    const { service, manager } = setup(status);
    const result = await service.create(form, 3);
    expect(result).toMatchObject({ subTotal: '20.00', discount: '2.00', total: '18.00', changeAmount: '2.00' });
    expect(manager.update).toHaveBeenCalledWith(OrderEntity, { id: 1 }, { status: OrderStatus.PAID });
  });
  it.each([OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.PAID, OrderStatus.CANCELED])('rejects %s orders', async status => {
    const { service, manager } = setup(status);
    await expect(service.create(form, 3)).rejects.toThrow('Only ready or served');
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('rejects unfinished items', async () => {
    await expect(setup(OrderStatus.READY, OrderItemStatus.PREPARING).service.create(form, 3)).rejects.toThrow('All non-canceled items');
  });
  it('rejects duplicate payments', async () => {
    await expect(setup(OrderStatus.READY, OrderItemStatus.READY, true).service.create(form, 3)).rejects.toThrow('already has a payment');
  });
  it('rejects insufficient cash and non-cash overpayment', async () => {
    const { service } = setup(OrderStatus.READY);
    await expect(service.create({ ...form, receivedAmount: '17.99' }, 3)).rejects.toThrow('less than the total');
    await expect(service.create({ ...form, paymentMethod: PaymentMethodEnum.KHQR }, 3)).rejects.toThrow('match the total exactly');
  });
});

import { OrderService } from '../src/modules/admin/operation/order/order.service';
import type { SelectQueryBuilder } from 'typeorm';
class FilterOrderService extends OrderService {
  statusFilter(query: SelectQueryBuilder<OrderEntity>, value: string) {
    return this.getFilters().status(query, value);
  }
}
describe('Payment queue status filter', () => {
  const service = new FilterOrderService(null as never, null as never, null as never);
  it.each(['READY', 'READY,SERVED'])('supports %s', value => {
    const query = { andWhere: jest.fn() };
    service.statusFilter(query as unknown as SelectQueryBuilder<OrderEntity>, value);
    expect(query.andWhere).toHaveBeenCalledWith('orders.status IN (:...order_status)', { order_status: value.split(',') });
  });
  it('rejects an invalid status in a combined filter', () => {
    const query = { andWhere: jest.fn() };
    expect(() => service.statusFilter(query as unknown as SelectQueryBuilder<OrderEntity>, 'READY,INVALID')).toThrow('Invalid order status');
    expect(query.andWhere).not.toHaveBeenCalled();
  });
});
