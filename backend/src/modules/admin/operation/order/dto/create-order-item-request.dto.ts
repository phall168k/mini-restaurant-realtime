import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { OrderItemStatus } from '../../../../../libs/enums/order-item-status.enum';
export class CreateOrderItemRequestDto {
  @ApiProperty() @IsInt() @Min(1) @Max(2147483647) itemId: number;
  @ApiProperty() @IsInt() @Min(1) @Max(2147483647) quantity: number;
  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'number' }],
    description:
      'Non-negative decimal, up to 12 integer digits and 2 decimal places',
  })
  @Transform(({ value }) => (typeof value === 'number' ? String(value) : value))
  @IsString()
  @Matches(/^\d{1,12}(\.\d{1,2})?$/)
  unitPrice: string;
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
  @ApiPropertyOptional({
    enum: OrderItemStatus,
    default: OrderItemStatus.PENDING,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(OrderItemStatus)
  status?: OrderItemStatus;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;
}
