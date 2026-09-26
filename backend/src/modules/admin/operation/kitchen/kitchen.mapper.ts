import { KitchenEntity } from './entities/kitchen.entity';
import {
  KitchenOrderResponseDto,
  KitchenResponseDto,
} from './dto/kitchen-response.dto';
import { UserMapper } from '../../system/user/user.mapper';
export class KitchenMapper {
  static async toDto(entity: KitchenEntity): Promise<KitchenResponseDto> {
    return Object.assign(new KitchenResponseDto(), {
      id: entity.id,
      orderId: entity.orderId,
      performedById: entity.performedById,
      order: entity.order
        ? Object.assign(new KitchenOrderResponseDto(), {
            id: entity.order.id,
            orderNumber: entity.order.orderNumber,
            tableId: entity.order.tableId,
            status: entity.order.status,
          })
        : null,
      performedBy: entity.performedBy
        ? await UserMapper.toSelectOptionDto(entity.performedBy)
        : null,
      status: entity.status,
      description: entity.description ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt ?? null,
    });
  }
}
