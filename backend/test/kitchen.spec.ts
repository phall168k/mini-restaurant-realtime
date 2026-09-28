import { OrderItemStatus } from '../src/libs/enums/order-item-status.enum';
import { describe, expect, it, jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { KitchenService } from '../src/modules/admin/operation/kitchen/kitchen.service';
import { KitchenEntity } from '../src/modules/admin/operation/kitchen/entities/kitchen.entity';
import { OrderEntity } from '../src/modules/admin/operation/order/entities/order.entity';
import { UserEntity } from '../src/modules/admin/system/user/entities/user.entity';
import { KitchenStatus } from '../src/libs/enums/kitchen-status.enum';
import { OrderStatus } from '../src/libs/enums/order-status.enum';

function setup() {
  const entity = {
    id: 1, orderId: 42, performedById: 7, status: KitchenStatus.PENDING,
    order: { id: 42, orderNumber: "ORD-42", items: [{ id: 3, quantity: 4 }], status: OrderStatus.PENDING },
  };
  const repository = {
    create: jest.fn((dto: object) => dto),
    save: jest.fn(async (dto: object) => ({ ...dto, id: 1 })),
    findOne: jest.fn(async () => entity),
    findOneBy: jest.fn(async () => entity),
  };
  const items = { findOneBy: jest.fn(async (_where: object): Promise<object | null> => ({ id: 42 })) };
  const users = { findOneBy: jest.fn(async () => ({ id: 7 })) };
  const service = new KitchenService(
    repository as unknown as Repository<KitchenEntity>,
    items as unknown as Repository<OrderEntity>,
    users as unknown as Repository<UserEntity>,
  );
  return { service, repository, items, entity };
}

describe('Kitchen order relationship', () => {
  it('creates a record for an order and returns the item relation', async () => {
    const { service, repository, items } = setup();
    const result = await service.create({ orderId: 42, performedById: 7 });
    expect(items.findOneBy).toHaveBeenCalledWith({ id: 42 });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ orderId: 42 }));
    expect(result.orderId).toBe(42);
    expect(result.order).toMatchObject({ id: 42, orderNumber: 'ORD-42', items: [{ id: 3, quantity: 4 }] });
    expect(result).not.toHaveProperty('orderItemId');
    expect(result).not.toHaveProperty('orderItem');
  });

  it('rejects missing orders before saving', async () => {
    const { service, repository, items } = setup();
    items.findOneBy.mockResolvedValue(null);
    await expect(service.create({ orderId: 999, performedById: 7 }))
      .rejects.toThrow('Order not found');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('validates the replacement order on update', async () => {
    const { service, repository, items } = setup();
    items.findOneBy.mockResolvedValue(null);
    await expect(service.update(1, { orderId: 999 }, 7))
      .rejects.toThrow('Order not found');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('updates the relationship to the requested item', async () => {
    const { service, repository, items } = setup();
    await service.update(1, { orderId: 55 }, 7);
    expect(items.findOneBy).toHaveBeenCalledWith({ id: 55 });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ orderId: 55 }));
  });
});

describe('Kitchen make all ready', () => {
  function readySetup(status = OrderStatus.PENDING, itemStatuses = ['PENDING', 'PREPARING', 'CANCELED', 'SERVED']) {
    const order = { id: 42, status, items: [] };
    const kitchens = [{ id: 1, orderId: 42, status: KitchenStatus.ACCEPTED }];
    const manager = {
      findOne: jest.fn(async () => order),
      find: jest.fn(async (entity: unknown) => entity === KitchenEntity ? kitchens : itemStatuses.map(status => ({ status }))),
      update: jest.fn(async (_entity: unknown, _criteria: unknown, _data: unknown) => ({})),
      save: jest.fn(async () => ({})),
    };
    const repository = { manager: { transaction: async (work: (manager: unknown) => unknown) => work(manager) } };
    const service = new KitchenService(repository as unknown as Repository<KitchenEntity>, {} as Repository<OrderEntity>, {
      findOneBy: async () => ({ id: 7 }),
    } as unknown as Repository<UserEntity>);
    return { service, manager, order, kitchens };
  }

  it('updates only pending/preparing items and marks the order and kitchen ready', async () => {
    const { service, manager, order, kitchens } = readySetup();
    await service.makeAllReady(42, 7);
    const criteria = manager.update.mock.calls[0]?.[1] as unknown as { status: { value: string[] } };
    expect(criteria.status.value).toEqual(['PENDING', 'PREPARING']);
    expect(order.status).toBe(OrderStatus.READY);
    expect(kitchens[0]).toMatchObject({ status: KitchenStatus.READY, performedById: 7 });
  });

  it('rejects canceled orders without modifying records', async () => {
    const { service, manager } = readySetup(OrderStatus.CANCELED);
    await expect(service.makeAllReady(42, 7)).rejects.toThrow('This order cannot be marked ready');
    expect(manager.update).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('rejects an order containing only canceled items', async () => {
    const { service, manager } = readySetup(OrderStatus.PENDING, ['CANCELED']);
    await expect(service.makeAllReady(42, 7)).rejects.toThrow('The order has no active items');
    expect(manager.update).not.toHaveBeenCalled();
  });
});

describe('Individual kitchen item actions', () => {
  function setupItems(statuses: string[]) {
    const items = statuses.map((status, i) => ({ id: i + 1, status }));
    const order = { id: 42, status: OrderStatus.PENDING, items };
    const kitchens = [{ id: 1, status: KitchenStatus.ACCEPTED }];
    const manager = {
      findOne: jest.fn(async () => order),
      find: jest.fn(async (entity: unknown) => entity === KitchenEntity ? kitchens : items),
      save: jest.fn(async (_entity: unknown, _data: unknown) => ({})),
    };
    const service = new KitchenService({ manager: {
      transaction: async (work: (manager: unknown) => unknown) => work(manager),
    } } as unknown as Repository<KitchenEntity>, {} as Repository<OrderEntity>, {
      findOneBy: async () => ({ id: 7 }),
    } as unknown as Repository<UserEntity>);
    return { service, manager, items, order, kitchens };
  }

  it('starts only the selected item', async () => {
    const { service, items, order } = setupItems(['PENDING', 'PENDING']);
    await service.updateItemStatus(42, 1, OrderItemStatus.PREPARING, 7);
    expect(items.map(item => item.status)).toEqual(['PREPARING', 'PENDING']);
    expect(order.status).toBe(OrderStatus.PREPARING);
  });

  it('sets order and kitchen ready when the final active item becomes ready', async () => {
    const { service, items, order, kitchens } = setupItems(['PREPARING', 'READY', 'CANCELED', 'SERVED']);
    await service.updateItemStatus(42, 1, OrderItemStatus.READY, 7);
    expect(items.map(item => item.status)).toEqual(['READY', 'READY', 'CANCELED', 'SERVED']);
    expect(order.status).toBe(OrderStatus.READY);
    expect(kitchens[0]).toMatchObject({ status: KitchenStatus.READY, performedById: 7 });
  });

  it.each(['READY', 'CANCELED', 'SERVED'])('does not start a %s item', async status => {
    const { service, manager } = setupItems([status]);
    await expect(service.updateItemStatus(42, 1, OrderItemStatus.PREPARING, 7)).rejects.toThrow('Invalid order item status transition');
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('rejects an item that does not belong to the order', async () => {
    const { service, manager } = setupItems(['PENDING']);
    await expect(service.updateItemStatus(42, 999, OrderItemStatus.READY, 7)).rejects.toThrow('Order item not found');
    expect(manager.save).not.toHaveBeenCalled();
  });
});
