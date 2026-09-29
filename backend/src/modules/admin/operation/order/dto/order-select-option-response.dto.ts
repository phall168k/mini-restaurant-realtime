import { ApiProperty } from "@nestjs/swagger";
import { RestaurantTableResponseDto } from "../../../master-data/restaurant-table/dto/restaurant-table-response.dto";
import { OrderStatus } from "../../../../../libs/enums/order-status.enum";

export class OrderSelectOptionResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    orderNumber: string;

    @ApiProperty()
    table: RestaurantTableResponseDto;

    @ApiProperty()
    status: OrderStatus;
}