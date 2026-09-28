import { ApiProperty } from "@nestjs/swagger";
import { OrderResponseDto } from "./order-response.dto";
import { ItemResponseDto } from "../../../master-data/item/dto/item-response.dto";
import { OrderItemStatus } from "../../../../../libs/enums/order-item-status.enum";

export class OrderItemResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    orderId: number;

    @ApiProperty()
    order: OrderResponseDto;

    @ApiProperty()
    itemId: number;

    @ApiProperty({ minimum: 1, example: 2 })
    quantity: number;

    @ApiProperty()
    item: ItemResponseDto;

    @ApiProperty()
    status: OrderItemStatus;

    @ApiProperty()
    createdAt: Date;
}