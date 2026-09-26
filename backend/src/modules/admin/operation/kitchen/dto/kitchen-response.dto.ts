import { ApiProperty } from '@nestjs/swagger';
import { KitchenStatus } from '../../../../../libs/enums/kitchen-status.enum';
import { OrderStatus } from '../../../../../libs/enums/order-status.enum';
import { UserSelectOptionResponseDto } from '../../../system/user/dto/user-select-option-response.dto';
export class KitchenOrderResponseDto {
  @ApiProperty() 
  id: number;

  @ApiProperty() 
  orderNumber: string;

  @ApiProperty() 
  tableId: number;

  @ApiProperty({ 
    enum: OrderStatus 
  }) 
  status: OrderStatus;
}
export class KitchenResponseDto {
  @ApiProperty() 
  id: number;

  @ApiProperty() 
  orderId: number;

  @ApiProperty({ 
    type: KitchenOrderResponseDto, 
    nullable: true 
  })
  order: KitchenOrderResponseDto | null;

  @ApiProperty() 
  performedById: number;

  @ApiProperty({ 
    type: UserSelectOptionResponseDto, 
    nullable: true 
  })
  performedBy: UserSelectOptionResponseDto | null;

  @ApiProperty({ 
    enum: KitchenStatus 
  }) 
  status: KitchenStatus;

  @ApiProperty({ 
    type: String, 
    nullable: true 
  }) 
  description: string | null;

  @ApiProperty() 
  createdAt: Date;

  @ApiProperty() 
  updatedAt: Date;

  @ApiProperty({ 
    type: Date, 
    nullable: true 
  }) 
  deletedAt: Date | null;
}
