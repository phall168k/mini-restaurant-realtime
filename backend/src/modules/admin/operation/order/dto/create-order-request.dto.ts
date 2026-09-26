import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { OrderStatus } from '../../../../../libs/enums/order-status.enum';
import { CreateOrderItemRequestDto } from './create-order-item-request.dto';
export class CreateOrderRequestDto {
  @ApiProperty() @IsString() @Matches(/\S/) @MaxLength(250) orderNumber: string;
  @ApiProperty() @IsInt() @Min(1) @Max(2147483647) tableId: number;
  @ApiPropertyOptional({ enum: OrderStatus, default: OrderStatus.PENDING })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(OrderStatus)
  status?: OrderStatus;
  @ApiPropertyOptional({
    oneOf: [{ type: 'string' }, { type: 'number' }],
    description:
      'Non-negative decimal, up to 10 integer digits and 2 decimal places',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'number' ? String(value) : value))
  @IsString()
  @Matches(/^\d{1,10}(\.\d{1,2})?$/)
  discount?: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;
  @ApiProperty({
    type: [CreateOrderItemRequestDto],
    description: 'Order lines; orderId is assigned by the server.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemRequestDto)
  items: CreateOrderItemRequestDto[];
  @ApiHideProperty() createdByUserId: number;
}
