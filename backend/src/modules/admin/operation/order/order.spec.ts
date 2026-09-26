import { jest } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { OrderService } from './order.service';
import { OrderEntity } from './entities/order.entity';
import { OrderStatus } from '../../../../libs/enums/order-status.enum';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderController } from './order.controller';
import { RoleEnum } from '../../../../libs/enums/role.enum';

function setup(status: OrderStatus = OrderStatus.DRAFT) {
  const entity = { id: 7, status, items: [], discount: '1.00' };
  const manager = {
    findOne: jest.fn<() => Promise<unknown>>().mockResolvedValue(entity),
    countBy: jest.fn<() => Promise<number>>().mockResolvedValue(2),
    save: jest.fn<() => Promise<unknown>>().mockResolvedValue(entity),
    transaction: jest.fn<(callback: (value: unknown) => Promise<unknown>) => Promise<unknown>>(),
  };
  manager.transaction.mockImplementation(callback => callback(manager));
  const service = new OrderService({ manager } as unknown as Repository<OrderEntity>);
  return { service, manager, entity };
}

describe('Submit order to kitchen', () => {
  it('transitions a locked draft to pending without replacing its lines', async () => {
    const { service, manager } = setup();
    const response = await service.submitToKitchen(7);
    expect(response.status).toBe(OrderStatus.PENDING);
    expect(response.discount).toBe('1.00');
    expect(manager.transaction).toHaveBeenCalledTimes(1);
    expect(manager.findOne).toHaveBeenNthCalledWith(1, OrderEntity, { where: { id: 7 }, lock: { mode: 'pessimistic_write' } });
    expect(manager.countBy).toHaveBeenCalledWith(OrderItemEntity, { orderId: 7 });
    expect(manager.save).toHaveBeenCalledTimes(1);
    expect(manager.save).toHaveBeenCalledWith(OrderEntity, expect.objectContaining({ status: OrderStatus.PENDING }));
  });
  it.each(Object.values(OrderStatus).filter(status => status !== OrderStatus.DRAFT))('rejects %s orders', async status => {
    const { service, manager } = setup(status);
    await expect(service.submitToKitchen(7)).rejects.toBeInstanceOf(ConflictException);
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('rejects a second submission', async () => {
    const { service, manager } = setup();
    await service.submitToKitchen(7);
    await expect(service.submitToKitchen(7)).rejects.toBeInstanceOf(ConflictException);
    expect(manager.save).toHaveBeenCalledTimes(1);
  });
  it('rejects missing or soft-deleted orders', async () => {
    const { service, manager } = setup();
    manager.findOne.mockResolvedValue(null);
    await expect(service.submitToKitchen(7)).rejects.toBeInstanceOf(NotFoundException);
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('rejects orders without active lines', async () => {
    const { service, manager } = setup();
    manager.countBy.mockResolvedValue(0);
    await expect(service.submitToKitchen(7)).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('requires the receptionist role on the submission endpoint', () => {
    expect(Reflect.getMetadata('roles', OrderController.prototype.submitToKitchen)).toEqual([RoleEnum.RECEPTIONIST]);
  });
});
