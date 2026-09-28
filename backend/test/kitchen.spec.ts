import { describe, expect, it, jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { KitchenService } from '../src/modules/admin/operation/kitchen/kitchen.service';
import { KitchenEntity } from '../src/modules/admin/operation/kitchen/entities/kitchen.entity';
import { OrderItemEntity } from '../src/modules/admin/operation/order/entities/order-item.entity';
import { UserEntity } from '../src/modules/admin/system/user/entities/user.entity';
import { KitchenStatus } from '../src/libs/enums/kitchen-status.enum';
import { OrderItemStatus } from '../src/libs/enums/order-item-status.enum';

function setup() {
  const entity = {
    id: 1, orderItemId: 42, performedById: 7, status: KitchenStatus.PENDING,
    orderItem: { id: 42, orderId: 10, itemId: 3, quantity: 4, status: OrderItemStatus.PENDING },
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
    items as unknown as Repository<OrderItemEntity>,
    users as unknown as Repository<UserEntity>,
  );
  return { service, repository, items, entity };
}

describe('Kitchen order-item relationship', () => {
  it('creates a record for an order item and returns the item relation', async () => {
    const { service, repository, items } = setup();
    const result = await service.create({ orderItemId: 42, performedById: 7 });
    expect(items.findOneBy).toHaveBeenCalledWith({ id: 42 });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ orderItemId: 42 }));
    expect(result.orderItemId).toBe(42);
    expect(result.orderItem).toMatchObject({ id: 42, orderId: 10, quantity: 4 });
    expect(result).not.toHaveProperty('orderId');
    expect(result).not.toHaveProperty('order');
  });

  it('rejects missing order items before saving', async () => {
    const { service, repository, items } = setup();
    items.findOneBy.mockResolvedValue(null);
    await expect(service.create({ orderItemId: 999, performedById: 7 }))
      .rejects.toThrow('Order item not found');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('validates the replacement order item on update', async () => {
    const { service, repository, items } = setup();
    items.findOneBy.mockResolvedValue(null);
    await expect(service.update(1, { orderItemId: 999 }, 7))
      .rejects.toThrow('Order item not found');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('updates the relationship to the requested item', async () => {
    const { service, repository, items } = setup();
    await service.update(1, { orderItemId: 55 }, 7);
    expect(items.findOneBy).toHaveBeenCalledWith({ id: 55 });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ orderItemId: 55 }));
  });
});
