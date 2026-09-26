import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../../../../libs/enums/order-status.enum';
import { OrderItemStatus } from '../../../../../libs/enums/order-item-status.enum';
import { ItemSelectOptionResponseDto } from '../../../master-data/item/dto/item-select-option-response.dto';
import { RestaurantTableSelectOptionResponseDto } from '../../../master-data/restaurant-table/dto/restaurant-table-select-option-response.dto';
import { UserResponseDto } from '../../../system/user/dto/user-response.dto';
export class OrderItemResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() orderId: number;
  @ApiProperty() itemId: number;
  @ApiProperty({ type: ItemSelectOptionResponseDto, nullable: true })
  item: ItemSelectOptionResponseDto | null;
  @ApiProperty() quantity: number;
  @ApiProperty({ example: '12.50' }) unitPrice: string;
  @ApiProperty({ example: '0.00' }) discount: string;
  @ApiProperty({ enum: OrderItemStatus }) status: OrderItemStatus;
  @ApiProperty({ type: String, nullable: true }) note: string | null;
}
export class OrderResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() orderNumber: string;
  @ApiProperty() tableId: number;
  @ApiProperty({ type: RestaurantTableSelectOptionResponseDto, nullable: true })
  table: RestaurantTableSelectOptionResponseDto | null;
  @ApiProperty({ enum: OrderStatus }) status: OrderStatus;
  @ApiProperty({ example: '0.00' }) discount: string;
  @ApiProperty({ type: String, nullable: true }) note: string | null;
  @ApiProperty() createdByUserId: number;
  @ApiProperty({ type: UserResponseDto, nullable: true })
  createdByUser: UserResponseDto | null;
  @ApiProperty({ type: [OrderItemResponseDto] }) items: OrderItemResponseDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: Date, nullable: true }) deletedAt: Date | null;
}
