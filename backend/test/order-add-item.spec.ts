import { describe, expect, it, jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { OrderService } from '../src/modules/admin/operation/order/order.service';
import { OrderEntity } from '../src/modules/admin/operation/order/entities/order.entity';
import { OrderItemEntity } from '../src/modules/admin/operation/order/entities/order-item.entity';
import { OrderStatus } from '../src/libs/enums/order-status.enum';
import { OrderItemStatus } from '../src/libs/enums/order-item-status.enum';
import { RealtimeEvent } from '../src/libs/constants/realtime-event.constant';
import { RealtimeService } from '../src/modules/realtime/realtime.service';

function setup(status = OrderStatus.PENDING) {
  const existing = { id: 10, orderId: 42, itemId: 1, quantity: 2, unitPrice: '3.00', discount: '0.00', note: 'Existing', status: OrderItemStatus.READY };
  const order = { id: 42, status, items: [existing] };
  const manager = {
    findOne: jest.fn(async (): Promise<typeof order | null> => order),
    findBy: jest.fn(async (): Promise<Array<{ id: number }>> => [{ id: 1 }]),
    create: (_entity: unknown, data: object) => data,
    save: jest.fn(async (_entity: unknown, data: object) => {
      const line = { id: 11, ...data } as typeof existing;
      order.items.push(line);
      return line;
    }),
    update: jest.fn(async (_entity: unknown, _criteria: unknown, data: { status: OrderStatus }) => {
      order.status = data.status;
      return { affected: 1 };
    }),
    softDelete: jest.fn(),
  };
  let committed = false;
  const repository = { manager: { transaction: async (work: (manager: unknown) => unknown) => {
    const result = await work(manager);
    committed = true;
    return result;
  } } };
  const notificationStates: boolean[] = [];
  const realtime = { emitToRole: jest.fn(() => { notificationStates.push(committed); }) };
  const service = new OrderService(repository as unknown as Repository<OrderEntity>, {} as Repository<OrderItemEntity>, realtime as unknown as RealtimeService);
  const item = { itemId: 1, quantity: 1, unitPrice: '4.00' };
  return { service, manager, item, existing, realtime, notificationStates };
}

describe('Add an order item', () => {
  it('appends even the same menu item without modifying or replacing existing lines', async () => {
    const { service, manager, item, existing } = setup();
    const result = await service.addItemToOrder(42, item);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject(existing);
    expect(result.items[1]).toMatchObject({ ...item, orderId: 42, status: OrderItemStatus.PENDING, discount: '0.00', note: null });
    expect(manager.softDelete).not.toHaveBeenCalled();
    expect(manager.findOne).toHaveBeenCalledWith(OrderEntity, { where: { id: 42 }, lock: { mode: 'pessimistic_write' } });
  });
  it.each([
    [OrderStatus.DRAFT, OrderItemStatus.DRAFT, OrderStatus.DRAFT],
    [OrderStatus.PENDING, OrderItemStatus.PENDING, OrderStatus.PENDING],
    [OrderStatus.PREPARING, OrderItemStatus.PENDING, OrderStatus.PENDING],
    [OrderStatus.READY, OrderItemStatus.PENDING, OrderStatus.PENDING],
  ])('sets item and header statuses for %s orders', async (initial, lineStatus, headerStatus) => {
    const { service, item } = setup(initial);
    const result = await service.addItemToOrder(42, { ...item, status: OrderItemStatus.SERVED, discount: '1.00', note: 'Extra spicy' });
    expect(result.status).toBe(headerStatus);
    expect(result.items[1]).toMatchObject({ status: lineStatus, discount: '1.00', note: 'Extra spicy' });
  });
  it.each([OrderStatus.PAID, OrderStatus.CANCELED, OrderStatus.SERVED])('rejects additions to %s orders', async status => {
    const { service, manager, item } = setup(status);
    await expect(service.addItemToOrder(42, item)).rejects.toThrow('Items can only be added');
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('rejects missing orders', async () => {
    const { service, manager, item } = setup();
    manager.findOne.mockResolvedValue(null);
    await expect(service.addItemToOrder(42, item)).rejects.toThrow('Order not found');
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('rejects missing menu items before writing', async () => {
    const { service, manager, item } = setup();
    manager.findBy.mockResolvedValue([]);
    await expect(service.addItemToOrder(42, item)).rejects.toThrow('One or more items not found');
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('notifies only the new line after commit while returning the full order', async () => {
    const { service, item, realtime, notificationStates } = setup(OrderStatus.READY);
    const result = await service.addItemToOrder(42, item);
    expect(result.items).toHaveLength(2);
    expect(realtime.emitToRole).toHaveBeenCalledWith('role:Cooker', RealtimeEvent.ORDER_ITEM_ADD_MORE, {
      ...result, items: [expect.objectContaining({ id: 11, itemId: 1 })],
    });
    expect(notificationStates).toEqual([true]);
  });
  it('does not notify the kitchen for drafts', async () => {
    const { service, item, realtime } = setup(OrderStatus.DRAFT);
    await service.addItemToOrder(42, item);
    expect(realtime.emitToRole).not.toHaveBeenCalled();
  });
  it('does not notify when the transaction fails', async () => {
    const { service, item, manager, realtime } = setup();
    manager.findBy.mockResolvedValue([]);
    await expect(service.addItemToOrder(42, item)).rejects.toThrow();
    expect(realtime.emitToRole).not.toHaveBeenCalled();
  });
  it('returns the saved order even if notification fails', async () => {
    const { service, item, realtime } = setup();
    realtime.emitToRole.mockImplementation(() => { throw new Error('Socket unavailable'); });
    await expect(service.addItemToOrder(42, item)).resolves.toMatchObject({ status: OrderStatus.PENDING });
  });

});
