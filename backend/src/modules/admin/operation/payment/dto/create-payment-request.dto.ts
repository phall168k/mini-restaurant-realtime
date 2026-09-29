import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethodEnum } from '../../../../../libs/enums/payment-method.enum';
import { AttachmentDto } from '../../../../../libs/dtos/attachment.dto';

// Totals, payment number/status, and cashier identity are assigned by the server.
export class CreatePaymentRequestDto {
  @ApiProperty() @IsInt() @Min(1) @Max(2147483647) orderId: number;
  @ApiProperty({ enum: PaymentMethodEnum })
  @IsEnum(PaymentMethodEnum)
  paymentMethod: PaymentMethodEnum;
  @ApiProperty({
    type: String,
    example: '20.00',
    description:
      'Amount received, with up to 12 integer digits and 2 decimal places.',
  })
  @Transform(({ value }) => (typeof value === 'number' ? String(value) : value))
  @IsString()
  @Matches(/^\d{1,12}(\.\d{1,2})?$/)
  receivedAmount: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  referenceNo?: string | null;
  @ApiPropertyOptional({ type: [AttachmentDto], nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachment?: AttachmentDto[] | null;
}
