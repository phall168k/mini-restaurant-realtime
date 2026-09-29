import { describe, expect, it, jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { OrderService } from '../src/modules/admin/operation/order/order.service';
import { OrderEntity } from '../src/modules/admin/operation/order/entities/order.entity';
import { OrderItemEntity } from '../src/modules/admin/operation/order/entities/order-item.entity';
import { OrderStatus } from '../src/libs/enums/order-status.enum';
import { OrderItemStatus } from '../src/libs/enums/order-item-status.enum';
import { RealtimeEvent } from '../src/libs/constants/realtime-event.constant';
import { RealtimeService } from '../src/modules/realtime/realtime.service';

function setup() {
  const line = { id: 7, orderId: 42, status: OrderItemStatus.PENDING };
  const order = { id: 42, status: OrderStatus.PENDING };
  const manager = {
    findOne: async (entity: unknown) => entity === OrderEntity ? order : line,
    find: async () => [line],
    update: jest.fn(async (entity: unknown, _where: unknown, data: { status: OrderItemStatus | OrderStatus }) => {
      if (entity === OrderItemEntity) line.status = data.status as OrderItemStatus;
      else order.status = data.status as OrderStatus;
      return { affected: 1 };
    }),
  };
  let committed = false;
  const notificationStates: boolean[] = [];
  const realtime = { emitToRoles: jest.fn(() => { notificationStates.push(committed); }) };
  const repository = { manager: { transaction: async (work: (manager: unknown) => unknown) => {
    const result = await work(manager);
    committed = true;
    return result;
  } } };
  const service = new OrderService(repository as unknown as Repository<OrderEntity>, {} as Repository<OrderItemEntity>, realtime as unknown as RealtimeService);
  return { service, manager, realtime, notificationStates };
}

describe('Order item status event payload', () => {
  it.each([
    [OrderItemStatus.PREPARING, OrderStatus.PREPARING],
    [OrderItemStatus.READY, OrderStatus.READY],
  ])('emits nested item status for %s after commit', async (status, orderStatus) => {
    const { service, realtime, notificationStates } = setup();
    const result = await service.changeItemStatus(7, status);
    expect(realtime.emitToRoles).toHaveBeenCalledTimes(1);
    expect(realtime.emitToRoles).toHaveBeenCalledWith(
      ['role:Receptionist', 'role:Cooker'],
      RealtimeEvent.ORDER_ITEM_STATUS_CHANGED,
      { id: 42, status: orderStatus, item: { orderItemId: 7, status } },
    );
    expect(notificationStates).toEqual([true]);
    expect(result).toEqual({ id: 7, orderId: 42, status, orderStatus });
  });

  it('does not emit when the update fails', async () => {
    const { service, manager, realtime } = setup();
    manager.update.mockResolvedValue({ affected: 0 });
    await expect(service.changeItemStatus(7, OrderItemStatus.READY)).rejects.toThrow('Item changed');
    expect(realtime.emitToRoles).not.toHaveBeenCalled();
  });
});
