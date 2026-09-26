import {
  BadRequestException,
  ConflictException,
  Injectable,
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

@Injectable()
export class OrderService extends BaseCrudService<
  OrderEntity,
  OrderResponseDto
> {
  protected queryName = 'orders';
  protected SEARCH_FIELDS = ['orderNumber', 'note', 'table.name', 'table.code'];
  protected FILTER_FIELDS = ['orderNumber'];
  constructor(
    @InjectRepository(OrderEntity)
    private readonly repository: Repository<OrderEntity>,
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
          status: line.status,
          note: line.note ?? null,
        }),
      ),
    );
  }
  async create(dto: CreateOrderRequestDto): Promise<OrderResponseDto> {
    try {
      return await this.repository.manager.transaction(async (manager) => {
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
        await this.saveLines(manager, entity.id, dto);
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
        entity.status = OrderStatus.PENDING;
        await manager.save(OrderEntity, entity);
        return OrderMapper.toDto(await this.load(manager, id));
      };
      return await (transactionManager
        ? submit(transactionManager)
        : this.repository.manager.transaction(submit));
    } catch (error) {
      handleError(error);
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
        await this.saveLines(manager, id, dto);
        return OrderMapper.toDto(await this.load(manager, id));
      });
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
}
