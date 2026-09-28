import { OrderItemMapper } from '../order/order-item.mapper';
import { KitchenEntity } from './entities/kitchen.entity';
import { KitchenResponseDto } from './dto/kitchen-response.dto';
import { UserMapper } from '../../system/user/user.mapper';
export class KitchenMapper {
  static async toDto(entity: KitchenEntity): Promise<KitchenResponseDto> {
    return Object.assign(new KitchenResponseDto(), {
      id: entity.id,
      orderItemId: entity.orderItemId,
      performedById: entity.performedById,
      orderItem: entity.orderItem
        ? await OrderItemMapper.toDto(entity.orderItem)
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
