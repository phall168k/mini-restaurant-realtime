import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { KitchenStatus } from '../../../../../libs/enums/kitchen-status.enum';

export class CreateKitchenRequestDto {
  @ApiProperty({ 
    description: 'ID of the related order' 
  })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  orderId: number;

  @ApiPropertyOptional({ 
    enum: KitchenStatus, 
    default: KitchenStatus.PENDING 
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(KitchenStatus)
  status?: KitchenStatus;

  @ApiPropertyOptional({ 
    type: String, 
    nullable: true 
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiHideProperty() 
  performedById: number;
}
