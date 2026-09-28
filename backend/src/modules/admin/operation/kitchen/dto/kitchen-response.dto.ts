import { ApiProperty } from '@nestjs/swagger';
import { KitchenStatus } from '../../../../../libs/enums/kitchen-status.enum';
import { OrderItemResponseDto } from '../../order/dto/order-item-response.dto';
import { UserSelectOptionResponseDto } from '../../../system/user/dto/user-select-option-response.dto';
export class KitchenResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  orderItemId: number;

  @ApiProperty({
    type: OrderItemResponseDto,
    nullable: true,
  })
  orderItem: OrderItemResponseDto | null;

  @ApiProperty()
  performedById: number;

  @ApiProperty({
    type: UserSelectOptionResponseDto,
    nullable: true,
  })
  performedBy: UserSelectOptionResponseDto | null;

  @ApiProperty({
    enum: KitchenStatus,
  })
  status: KitchenStatus;

  @ApiProperty({
    type: String,
    nullable: true,
  })
  description: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({
    type: Date,
    nullable: true,
  })
  deletedAt: Date | null;
}
