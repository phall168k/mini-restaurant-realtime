import { OrderItemEntity } from '../order/entities/order-item.entity';
import { OrderStatus } from '../../../../libs/enums/order-status.enum';
import { OrderItemStatus } from '../../../../libs/enums/order-item-status.enum';
import { OrderMapper } from '../order/order.mapper';
import { OrderResponseDto } from '../order/dto/order-response.dto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { BaseCrudService } from '../../../../libs/services/base-crud.service';
import { QueryFilters } from '../../../../libs/services/pagination/filter.helper';
import { handleError } from '../../../../libs/utils/handle-error.util';
import { KitchenStatus } from '../../../../libs/enums/kitchen-status.enum';
import { KitchenEntity } from './entities/kitchen.entity';
import { OrderEntity } from '../order/entities/order.entity';
import { UserEntity } from '../../system/user/entities/user.entity';
import { KitchenResponseDto } from './dto/kitchen-response.dto';
import { CreateKitchenRequestDto } from './dto/create-kitchen-request.dto';
import { UpdateKitchenRequestDto } from './dto/update-kitchen-request.dto';
import { KitchenMapper } from './kitchen.mapper';

@Injectable()
export class KitchenService extends BaseCrudService<
  KitchenEntity,
  KitchenResponseDto
> {
  protected queryName = 'kitchen';
  protected SEARCH_FIELDS = [
    'description',
    'order.orderNumber',
    'performedBy.username',
  ];
  constructor(
    @InjectRepository(KitchenEntity)
    private readonly repository: Repository<KitchenEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {
    super();
  }
  protected getMapperResponseEntityFields() {
    return KitchenMapper.toDto;
  }
  protected getListQuery() {
    return this.repository
      .createQueryBuilder(this.queryName)
      .leftJoinAndSelect('kitchen.order', 'order')
      .leftJoinAndSelect('order.table', 'table')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.item', 'item')
      .leftJoinAndSelect('kitchen.performedBy', 'performedBy');
  }
  protected getFilters(): QueryFilters<KitchenEntity> {
    const filters: QueryFilters<KitchenEntity> = {
      status: (query, value) => {
        if (!Object.values(KitchenStatus).includes(value as KitchenStatus))
          throw new BadRequestException('Invalid kitchen status');
        return query.andWhere('kitchen.status = :kitchen_status', {
          kitchen_status: value,
        });
      },
    };
    for (const field of ['orderId', 'performedById'])
      filters[field] = (query, value) => {
        const id =
          typeof value === 'number'
            ? value
            : typeof value === 'string' && /^\d+$/.test(value)
              ? Number(value)
              : NaN;
        if (!Number.isInteger(id) || id < 1 || id > 2147483647)
          throw new BadRequestException(`${field} must be a positive integer`);
        return query.andWhere(`kitchen.${field} = :kitchen_${field}`, {
          [`kitchen_${field}`]: id,
        });
      };
    return filters;
  }
  private async requireOrder(id: number) {
    if (!(await this.orderRepository.findOneBy({ id })))
      throw new NotFoundException('Order not found');
  }
  private async requireUser(id: number) {
    if (!(await this.userRepository.findOneBy({ id })))
      throw new NotFoundException('User not found');
  }
  async create(dto: CreateKitchenRequestDto): Promise<KitchenResponseDto> {
    try {
      await this.requireOrder(dto.orderId);
      await this.requireUser(dto.performedById);
      const entity = await this.repository.save(
        this.repository.create({
          orderId: dto.orderId,
          performedById: dto.performedById,
          status: dto.status ?? KitchenStatus.PENDING,
          description: dto.description ?? null,
        }),
      );
      return await this.findOne(entity.id);
    } catch (error) {
      handleError(error);
    }
  }
  async findOne(id: number): Promise<KitchenResponseDto> {
    try {
      const entity = await this.repository.findOne({
        where: { id },
        relations: {
          order: { table: true, items: { item: true } },
          performedBy: true,
        },
      });
      if (!entity) throw new NotFoundException('Kitchen record not found');
      return await KitchenMapper.toDto(entity);
    } catch (error) {
      handleError(error);
    }
  }
  async update(
    id: number,
    dto: UpdateKitchenRequestDto,
    performedById: number,
  ): Promise<KitchenResponseDto> {
    try {
      const entity = await this.repository.findOneBy({ id });
      if (!entity) throw new NotFoundException('Kitchen record not found');
      if (dto.orderId !== undefined)
        await this.requireOrder(dto.orderId);
      await this.requireUser(performedById);
      if (dto.orderId !== undefined) entity.orderId = dto.orderId;
      if (dto.status !== undefined) entity.status = dto.status;
      if (dto.description !== undefined) entity.description = dto.description;
      entity.performedById = performedById;
      await this.repository.save(entity);
      return await this.findOne(id);
    } catch (error) {
      handleError(error);
    }
  }
  async updateItemStatus(orderId: number, itemId: number, status: OrderItemStatus.PREPARING | OrderItemStatus.READY, performedById: number): Promise<OrderResponseDto> {
    try {
      await this.requireUser(performedById);
      return await this.repository.manager.transaction(async (manager) => {
        const order = await manager.findOne(OrderEntity, {
          where: { id: orderId }, lock: { mode: 'pessimistic_write' },
        });
        if (!order) throw new NotFoundException('Order not found');
        if (![OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY].includes(order.status)) {
          throw new ConflictException('This order cannot be prepared');
        }
        const kitchens = await manager.find(KitchenEntity, {
          where: { orderId, status: In([KitchenStatus.PENDING, KitchenStatus.ACCEPTED, KitchenStatus.PREPARING, KitchenStatus.READY]) },
          lock: { mode: 'pessimistic_write' },
        });
        if (!kitchens.length) throw new ConflictException('No active kitchen record for this order');
        const items = await manager.find(OrderItemEntity, {
          where: { orderId }, lock: { mode: 'pessimistic_write' },
        });
        const item = items.find(line => line.id === itemId);
        if (!item) throw new NotFoundException('Order item not found');
        if (item.status !== status) {
          const allowed = status === OrderItemStatus.PREPARING
            ? item.status === OrderItemStatus.PENDING
            : [OrderItemStatus.PENDING, OrderItemStatus.PREPARING].includes(item.status);
          if (!allowed) throw new ConflictException('Invalid order item status transition');
          item.status = status;
          await manager.save(OrderItemEntity, item);
        }
        const allReady = items.filter(line => line.status !== OrderItemStatus.CANCELED)
          .every(line => [OrderItemStatus.READY, OrderItemStatus.SERVED].includes(line.status));
        order.status = allReady ? OrderStatus.READY : OrderStatus.PREPARING;
        await manager.save(OrderEntity, order);
        for (const kitchen of kitchens) {
          kitchen.status = allReady ? KitchenStatus.READY : KitchenStatus.PREPARING;
          kitchen.performedById = performedById;
        }
        await manager.save(KitchenEntity, kitchens);
        const result = await manager.findOne(OrderEntity, {
          where: { id: orderId }, relations: { table: true, items: { item: true }, createdByUser: true },
        });
        return OrderMapper.toDto(result!);
      });
    } catch (error) { handleError(error); }
  }

  async makeAllReady(orderId: number, performedById: number): Promise<OrderResponseDto> {
    try {
      await this.requireUser(performedById);
      return await this.repository.manager.transaction(async (manager) => {
        const order = await manager.findOne(OrderEntity, {
          where: { id: orderId }, lock: { mode: 'pessimistic_write' },
        });
        if (!order) throw new NotFoundException('Order not found');
        if (![OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY].includes(order.status)) {
          throw new ConflictException('This order cannot be marked ready');
        }
        const kitchens = await manager.find(KitchenEntity, {
          where: { orderId, status: In([KitchenStatus.PENDING, KitchenStatus.ACCEPTED, KitchenStatus.PREPARING, KitchenStatus.READY]) },
          lock: { mode: 'pessimistic_write' },
        });
        if (!kitchens.length) throw new ConflictException('No active kitchen record for this order');
        const items = await manager.find(OrderItemEntity, {
          where: { orderId }, lock: { mode: 'pessimistic_write' },
        });
        if (!items.some(item => item.status !== OrderItemStatus.CANCELED)) {
          throw new ConflictException('The order has no active items');
        }
        await manager.update(OrderItemEntity, {
          orderId, deletedAt: IsNull(), status: In([OrderItemStatus.PENDING, OrderItemStatus.PREPARING]),
        }, { status: OrderItemStatus.READY });
        order.status = OrderStatus.READY;
        await manager.save(OrderEntity, order);
        for (const kitchen of kitchens) {
          kitchen.status = KitchenStatus.READY;
          kitchen.performedById = performedById;
        }
        await manager.save(KitchenEntity, kitchens);
        const result = await manager.findOne(OrderEntity, {
          where: { id: orderId }, relations: { table: true, items: { item: true }, createdByUser: true },
        });
        return OrderMapper.toDto(result!);
      });
    } catch (error) {
      handleError(error);
    }
  }

  async remove(id: number): Promise<KitchenResponseDto> {
    try {
      const entity = await this.repository.findOne({
        where: { id },
        relations: {
          order: { table: true, items: { item: true } },
          performedBy: true,
        },
      });
      if (!entity) throw new NotFoundException('Kitchen record not found');
      return await KitchenMapper.toDto(
        await this.repository.softRemove(entity),
      );
    } catch (error) {
      handleError(error);
    }
  }
}
