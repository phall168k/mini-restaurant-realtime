import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { BaseCrudService } from '../../../../libs/services/base-crud.service';
import { QueryFilters } from '../../../../libs/services/pagination/filter.helper';
import { handleError } from '../../../../libs/utils/handle-error.util';
import { OrderStatus } from '../../../../libs/enums/order-status.enum';
import { RestaurantTableStatuseEnum } from '../../../../libs/enums/restaurant-table-status.enum';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { ItemEntity } from '../../master-data/item/entities/item.entity';
import { RestaurantTableEntity } from '../../master-data/restaurant-table/entities/restaurant-table.entity';
import { CreateOrderRequestDto } from './dto/create-order-request.dto';
import { UpdateOrderRequestDto } from './dto/update-order-request.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrderMapper } from './order.mapper';
import { OrderItemStatus } from '../../../../libs/enums/order-item-status.enum';
import { OrderItemMapper } from './order-item.mapper';
import { OrderItemResponseDto } from './dto/order-item-response.dto';
import { RealtimeService } from '../../../realtime/realtime.service';
import { RoleEnum } from '../../../../libs/enums/role.enum';
import { RealtimeEvent } from '../../../../libs/constants/realtime-event.constant';
import { CreateOrderItemRequestDto } from './dto/create-order-item-request.dto';
import { OrderSelectOptionResponseDto } from './dto/order-select-option-response.dto';

@Injectable()
export class OrderService extends BaseCrudService<
  OrderEntity,
  OrderResponseDto
> {
  private readonly realtimeLogger = new Logger(OrderService.name);
  protected queryName = 'orders';
  protected SEARCH_FIELDS = ['orderNumber', 'note', 'table.name', 'table.code'];
  protected FILTER_FIELDS = ['orderNumber'];
  constructor(
    @InjectRepository(OrderEntity)
    private readonly repository: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly itemOrderRepository: Repository<OrderItemEntity>,
    private readonly realtimeService: RealtimeService,
  ) {
    super();
  }
  protected getMapperResponseEntityFields() {
    return OrderMapper.toDto;
  }
  protected getFilters(): QueryFilters<OrderEntity> {
    const filters: QueryFilters<OrderEntity> = {
      status: (query, value) => {
        if (!Object.values(OrderStatus).includes(value as OrderStatus))
          throw new BadRequestException('Invalid order status');
        return query.andWhere('orders.status = :order_status', {
          order_status: value,
        });
      },
    };
    for (const field of ['tableId', 'createdByUserId'])
      filters[field] = (query, value) => {
        const id =
          typeof value === 'number'
            ? value
            : typeof value === 'string' && /^\d+$/.test(value)
              ? Number(value)
              : NaN;
        if (!Number.isInteger(id) || id < 1 || id > 2147483647)
          throw new BadRequestException(`${field} must be a positive integer`);
        return query.andWhere(`orders.${field} = :order_${field}`, {
          [`order_${field}`]: id,
        });
      };
    return filters;
  }
  protected getListQuery() {
    return this.repository
      .createQueryBuilder('orders')
      .leftJoinAndSelect('orders.table', 'table')
      .leftJoinAndSelect('orders.createdByUser', 'createdByUser')
      .leftJoinAndSelect('orders.items', 'orderItems')
      .leftJoinAndSelect('orderItems.item', 'item');
  }
  private async load(manager: EntityManager, id: number) {
    const entity = await manager.findOne(OrderEntity, {
      where: { id },
      relations: { table: true, createdByUser: true, items: { item: true } },
    });
    if (!entity) throw new NotFoundException('Order not found');
    return entity;
  }
  async findOne(id: number): Promise<OrderResponseDto> {
    try {
      return await OrderMapper.toDto(
        await this.load(this.repository.manager, id),
      );
    } catch (error) {
      handleError(error);
    }
  }
  private async validateRelations(
    manager: EntityManager,
    dto: UpdateOrderRequestDto,
  ) {
    if (
      dto.tableId !== undefined &&
      !(await manager.findOneBy(RestaurantTableEntity, { id: dto.tableId }))
    )
      throw new NotFoundException('Restaurant table not found');
    if (dto.items !== undefined) {
      const ids = [...new Set(dto.items.map((line) => line.itemId))];
      const items = await manager.findBy(ItemEntity, { id: In(ids) });
      if (items.length !== ids.length)
        throw new NotFoundException('One or more items not found');
    }
  }
  private async saveLines(
    manager: EntityManager,
    orderId: number,
    dto: UpdateOrderRequestDto,
    orderStatus: OrderStatus,
  ) {
    if (dto.items === undefined) return;
    await manager.softDelete(OrderItemEntity, { orderId });
    await manager.save(
      OrderItemEntity,
      dto.items.map((line) =>
        manager.create(OrderItemEntity, {
          orderId,
          itemId: line.itemId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount ?? '0.00',
          status: orderStatus === OrderStatus.DRAFT
            ? OrderItemStatus.DRAFT
            : line.status === OrderItemStatus.DRAFT
              ? OrderItemStatus.PENDING
              : line.status ?? OrderItemStatus.PENDING,
          note: line.note ?? null,
        }),
      ),
    );
  }
  async create(dto: CreateOrderRequestDto): Promise<OrderResponseDto> {
    try {
      const order = await this.repository.manager.transaction(async (manager) => {
        const status = dto.status ?? OrderStatus.PENDING;
        await this.validateRelations(manager, dto);
        const entity = await manager.save(
          OrderEntity,
          manager.create(OrderEntity, {
            orderNumber: dto.orderNumber,
            tableId: dto.tableId,
            status: status === OrderStatus.PENDING ? OrderStatus.DRAFT : status,
            discount: dto.discount ?? '0.00',
            note: dto.note ?? null,
            createdByUserId: dto.createdByUserId,
          }),
        );
        await this.saveLines(manager, entity.id, dto, status);
        await manager.update(
          RestaurantTableEntity,
          { id: dto.tableId },
          { status: RestaurantTableStatuseEnum.OCCUPIED },
        );
        if (status === OrderStatus.PENDING) {
          return this.submitToKitchen(entity.id, manager);
        }
        return OrderMapper.toDto(await this.load(manager, entity.id));
      });
      if ((dto.status ?? OrderStatus.PENDING) === OrderStatus.PENDING) {
        this.notifyKitchen(order);
      }
      return order;
    } catch (error) {
      handleError(error);
    }
  }

  // select options
  async selectOptions(status: OrderStatus): Promise<OrderSelectOptionResponseDto[]> {
    try {
      const entities = await this.repository.find({
        relations: {
          table: true,
        },
        where: {
          status,
        },
        order: {
          createdAt: 'DESC',
        },
      });
      const items = Promise.all(
        entities.map((item) => OrderMapper.toSelectOptionDto(item)),
      );
      return items;
    } catch (error) {
      handleError(error);
    }
  }

  // Append a new line without replacing existing items or their preparation states.
  async addItemToOrder(
    orderId: number,
    item: CreateOrderItemRequestDto,
  ): Promise<OrderResponseDto> {
    try {
      const { updatedOrder, addedItemId } = await this.repository.manager.transaction(async (manager) => {
        // Share the order lock used by edits and kitchen status changes.
        const order = await manager.findOne(OrderEntity, {
          where: { id: orderId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!order) throw new NotFoundException('Order not found');
        if (![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY].includes(order.status)) {
          throw new ConflictException('Items can only be added to draft or active orders');
        }
        await this.validateRelations(manager, { items: [item] });

        // New items must go through preparation regardless of a supplied item status.
        const addedItem = await manager.save(OrderItemEntity, manager.create(OrderItemEntity, {
          orderId,
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount ?? '0.00',
          note: item.note ?? null,
          status: order.status === OrderStatus.DRAFT
            ? OrderItemStatus.DRAFT
            : OrderItemStatus.PENDING,
        }));

        // New pending work returns the header to Pending without changing existing lines.
        if (order.status !== OrderStatus.DRAFT && order.status !== OrderStatus.PENDING) {
          await manager.update(OrderEntity, { id: orderId }, { status: OrderStatus.PENDING });
        }
        return {
          updatedOrder: await OrderMapper.toDto(await this.load(manager, orderId)),
          addedItemId: addedItem.id,
        };
      });
      // Notify only after commit so the kitchen can load the newly saved item.
      if (updatedOrder.status === OrderStatus.PENDING) {
        // Match the inserted line ID, since the same menu item can appear more than once.
        this.notifyAddMoreItemKitchen({
          ...updatedOrder,
          items: updatedOrder.items.filter(line => line.id === addedItemId),
        });
      }
      return updatedOrder;
    } catch (error) {
      handleError(error);
    }
  }

  // Listing order item for cooker
  async itemOrderList(status: OrderItemStatus = OrderItemStatus.PENDING): Promise<OrderItemResponseDto[]> {
    try {
      const entities = await this.itemOrderRepository.find({
        relations: {
          order: {
            table: true,
            createdByUser: true,
          },
          item: true,
        },
        where: {
          status,
        },
        order: {
          createdAt: 'ASC',
        },
      });
      const items = Promise.all(
        entities.map((item) => OrderItemMapper.toDto(item)),
      );
      return items;
    } catch (error) {
      handleError(error);
    }
  }

  async submitToKitchen(
    id: number,
    transactionManager?: EntityManager,
  ): Promise<OrderResponseDto> {
    try {
      const submit = async (manager: EntityManager) => {
        const entity = await manager.findOne(OrderEntity, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!entity) throw new NotFoundException('Order not found');
        if (entity.status !== OrderStatus.DRAFT) {
          throw new ConflictException(
            'Only draft orders can be submitted to the kitchen',
          );
        }
        if (!(await manager.countBy(OrderItemEntity, { orderId: id }))) {
          throw new BadRequestException(
            'An order must contain at least one item',
          );
        }
        // Draft lines become visible to the kitchen only when the order is submitted.
        await manager.update(OrderItemEntity,
          { orderId: id, status: OrderItemStatus.DRAFT },
          { status: OrderItemStatus.PENDING },
        );
        entity.status = OrderStatus.PENDING;
        await manager.save(OrderEntity, entity);
        return OrderMapper.toDto(await this.load(manager, id));
      };
      // The caller owns commit and notification when using an existing transaction.
      if (transactionManager) return await submit(transactionManager);
      const order = await this.repository.manager.transaction(submit);
      this.notifyKitchen(order);
      return order;
    } catch (error) {
      handleError(error);
    }
  }

  private notifyKitchen(order: OrderResponseDto): void {
    try {
      this.realtimeService.emitToRole(
        `role:${RoleEnum.COOKER}`,
        RealtimeEvent.KITCHEN_ORDER_NEW,
        order,
      );
    } catch (error) {
      // The order is committed; a notification failure must not report a failed save.
      this.realtimeLogger.error('Order saved but kitchen notification failed', error);
    }
  }

  private notifyAddMoreItemKitchen(order: OrderResponseDto): void {
    try {
      this.realtimeService.emitToRole(
        `role:${RoleEnum.COOKER}`,
        RealtimeEvent.ORDER_ITEM_ADD_MORE,
        order,
      );
    } catch (error) {
      // The order is committed; a notification failure must not report a failed save.
      this.realtimeLogger.error('Order saved but kitchen notification failed', error);
    }
  }

  async update(
    id: number,
    dto: UpdateOrderRequestDto,
  ): Promise<OrderResponseDto> {
    try {
      return await this.repository.manager.transaction(async (manager) => {
        const entity = await manager.findOne(OrderEntity, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!entity) throw new NotFoundException('Order not found');
        await this.validateRelations(manager, dto);
        for (const field of [
          'orderNumber',
          'tableId',
          'status',
          'discount',
          'note',
        ] as const) {
          if (dto[field] !== undefined)
            Object.assign(entity, { [field]: dto[field] });
        }
        await manager.save(OrderEntity, entity);
        await this.saveLines(manager, id, dto, entity.status);
        // Header-only edits must keep the existing lines consistent as well.
        if (entity.status === OrderStatus.DRAFT) {
          await manager.update(OrderItemEntity, { orderId: id }, { status: OrderItemStatus.DRAFT });
        } else {
          await manager.update(OrderItemEntity,
            { orderId: id, status: OrderItemStatus.DRAFT },
            { status: OrderItemStatus.PENDING },
          );
        }
        return OrderMapper.toDto(await this.load(manager, id));
      });
    } catch (error) {
      handleError(error);
    }
  }
  // Serve a ready order atomically, preserving canceled lines and table occupancy.
  async serveOrder(orderId: number): Promise<OrderResponseDto> {
    try {
      const result = await this.repository.manager.transaction(async (manager) => {
        // Serialize serving with item additions and kitchen status updates.
        const order = await manager.findOne(OrderEntity, {
          where: { id: orderId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!order) throw new NotFoundException('Order not found');
        if (order.status !== OrderStatus.READY) {
          throw new ConflictException('Only ready orders can be served');
        }
        const items = await manager.find(OrderItemEntity, { where: { orderId } });
        const activeItems = items.filter(item => item.status !== OrderItemStatus.CANCELED);
        if (!activeItems.length || activeItems.some(item =>
          ![OrderItemStatus.READY, OrderItemStatus.SERVED].includes(item.status))) {
          throw new ConflictException('All non-canceled items must be ready before serving');
        }
        await manager.update(OrderItemEntity,
          { orderId, status: OrderItemStatus.READY },
          { status: OrderItemStatus.SERVED },
        );
        await manager.update(OrderEntity, { id: orderId }, { status: OrderStatus.SERVED });
        return OrderMapper.toDto(await this.load(manager, orderId));
      });
      // Emit the updated order only after the transaction has committed.
      try {
        this.realtimeService.emitToRoles(
          [`role:${RoleEnum.RECEPTIONIST}`, `role:${RoleEnum.COOKER}`, `role:${RoleEnum.CASHIER}`],
          RealtimeEvent.ORDER_STATUS_CHANGED,
          result,
        );
      } catch (error) {
        this.realtimeLogger.error('Order served but status notification failed', error);
      }
      return result;
    } catch (error) {
      handleError(error);
    }
  }

  async remove(id: number): Promise<OrderResponseDto> {
    try {
      return await this.repository.manager.transaction(async (manager) => {
        const locked = await manager.findOne(OrderEntity, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!locked) throw new NotFoundException('Order not found');
        const entity = await this.load(manager, id);
        await manager.softDelete(OrderItemEntity, { orderId: id });
        await manager.softRemove(OrderEntity, entity);
        return OrderMapper.toDto(entity);
      });
    } catch (error) {
      handleError(error);
    }
  }


// ===================================
// Kitchen operations
// ===================================
  async changeItemStatus(orderItemId: number, status: OrderItemStatus) {
    try {
      const result = await this.repository.manager.transaction(async (manager) => {
        const existing = await manager.findOne(OrderItemEntity, { where: { id: orderItemId } });
        if (!existing) throw new NotFoundException('Order item not found');
        // Serialize changes to different items of the same order before aggregating.
        const order = await manager.findOne(OrderEntity, {
          where: { id: existing.orderId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!order) throw new NotFoundException('Order not found');
        if (![OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY].includes(order.status)) {
          throw new ConflictException('This order cannot be changed in the kitchen');
        }
        const line = await manager.findOne(OrderItemEntity, {
          where: { id: orderItemId, orderId: order.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!line) throw new NotFoundException('Order item not found');
        const allowed: Partial<Record<OrderItemStatus, OrderItemStatus[]>> = {
          [OrderItemStatus.PENDING]: [OrderItemStatus.PREPARING, OrderItemStatus.READY, OrderItemStatus.CANCELED],
          [OrderItemStatus.PREPARING]: [OrderItemStatus.READY, OrderItemStatus.CANCELED],
          [OrderItemStatus.READY]: [OrderItemStatus.SERVED, OrderItemStatus.CANCELED],
        };
        if (!allowed[line.status]?.includes(status)) {
          throw new ConflictException(`Cannot change ${line.status} to ${status}`);
        }
        const update = await manager.update(OrderItemEntity,
          { id: orderItemId, status: line.status }, { status });
        if (!update.affected) throw new ConflictException('Item changed. Refresh and try again.');
        const items = await manager.find(OrderItemEntity, { where: { orderId: order.id } });
        const active = items.filter(item => item.status !== OrderItemStatus.CANCELED);
        let orderStatus = order.status;
        // Served items have already completed preparation; canceled items do not block readiness.
        if (active.length && active.every(item => [OrderItemStatus.READY, OrderItemStatus.SERVED].includes(item.status))) {
          orderStatus = OrderStatus.READY;
        } else if (order.status === OrderStatus.PENDING && active.some(item =>
          [OrderItemStatus.PREPARING, OrderItemStatus.READY, OrderItemStatus.SERVED].includes(item.status))) {
          orderStatus = OrderStatus.PREPARING;
        }
        if (orderStatus !== order.status) {
          await manager.update(OrderEntity, { id: order.id }, { status: orderStatus });
        }
        return { id: line.id, orderId: line.orderId, status, orderStatus };
      });
      try {
        this.realtimeService.emitToRoles(
          [`role:${RoleEnum.RECEPTIONIST}`, `role:${RoleEnum.COOKER}`],
          RealtimeEvent.ORDER_ITEM_STATUS_CHANGED,
          {
            id: result.orderId,
            status: result.orderStatus,
            item: {
              orderItemId: result.id,
              status: result.status,
            },
          },
        );
      } catch (error) {
        this.realtimeLogger.error('Item saved but status notification failed', error);
      }
      return result;
    } catch (error) {
      handleError(error);
    }
  }
}
