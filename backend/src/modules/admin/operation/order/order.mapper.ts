import { OrderEntity } from './entities/order.entity';
import {
  OrderResponseDto,
  OrderItemResponseDto,
} from './dto/order-response.dto';
import { ItemMapper } from '../../master-data/item/item.mapper';
import { RestaurantTableMapper } from '../../master-data/restaurant-table/restaurant-table.mapper';
import { UserMapper } from '../../system/user/user.mapper';
import { OrderSelectOptionResponseDto } from './dto/order-select-option-response.dto';
export class OrderMapper {
  static async toDto(entity: OrderEntity): Promise<OrderResponseDto> {
    return Object.assign(new OrderResponseDto(), {
      id: entity.id,
      orderNumber: entity.orderNumber,
      tableId: entity.tableId,
      table: entity.table
        ? RestaurantTableMapper.toDtoSelectOption(entity.table)
        : null,
      status: entity.status,
      discount: entity.discount,
      note: entity.note ?? null,
      createdByUserId: entity.createdByUserId,
      createdByUser: entity.createdByUser
        ? await UserMapper.toDto(entity.createdByUser)
        : null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt ?? null,
      items: (entity.items ?? [])
        .sort((a, b) => a.id - b.id)
        .map((line) =>
          Object.assign(new OrderItemResponseDto(), {
            id: line.id,
            orderId: line.orderId,
            itemId: line.itemId,
            item: line.item ? ItemMapper.toDtoSelectOption(line.item) : null,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discount: line.discount,
            status: line.status,
            note: line.note ?? null,
          }),
        ),
    });
  }

  public static async toSelectOptionDto(entity: OrderEntity): Promise<OrderSelectOptionResponseDto> {
    const dto = new OrderSelectOptionResponseDto();

    dto.id = entity.id;
    dto.orderNumber = entity.orderNumber;
    dto.status = entity.status;
    if (entity.table) {
      dto.table = await RestaurantTableMapper.toDto(entity.table);
    }

    return dto;
  }
}
