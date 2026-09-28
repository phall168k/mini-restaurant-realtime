import { ItemMapper } from "../../master-data/item/item.mapper";
import { OrderItemResponseDto } from "./dto/order-item-response.dto";
import { OrderItemEntity } from "./entities/order-item.entity";
import { OrderMapper } from "./order.mapper";

export class OrderItemMapper {
    public static async toDto(entity: OrderItemEntity): Promise<OrderItemResponseDto> {
        const dto = new OrderItemResponseDto();

        dto.id = entity.id;
        dto.orderId = entity.orderId;
        dto.itemId = entity.itemId;
        dto.quantity = entity.quantity;
        dto.status = entity.status;
        dto.createdAt = entity.createdAt;

        if (entity.order) {
            dto.order = await OrderMapper.toDto(entity.order);
        }

        if (entity.item) {
            dto.item = await ItemMapper.toDto(entity.item);
        }

        return dto;

    }
}