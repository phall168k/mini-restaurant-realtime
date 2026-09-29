import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodEnum } from '../../../../../libs/enums/payment-method.enum';
import { PaymentStatus } from '../../../../../libs/enums/payment-status.enum';
import { AttachmentDto } from '../../../../../libs/dtos/attachment.dto';
import { OrderResponseDto } from '../../order/dto/order-response.dto';

export class PaymentUserResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() username: string;
}
export class PaymentResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() paymentNo: string;
  @ApiProperty() orderId: number;
  @ApiProperty({ type: OrderResponseDto }) order: OrderResponseDto;
  @ApiProperty({ enum: PaymentMethodEnum }) paymentMethod: PaymentMethodEnum;
  @ApiProperty({ enum: PaymentStatus }) paymentStatus: PaymentStatus;
  @ApiProperty({ example: '20.00' }) subTotal: string;
  @ApiProperty({ example: '0.00' }) discount: string;
  @ApiProperty({ example: '20.00' }) total: string;
  @ApiProperty({ example: '25.00' }) receivedAmount: string;
  @ApiProperty({ example: '5.00' }) changeAmount: string;
  @ApiPropertyOptional({ nullable: true }) referenceNo: string | null;
  @ApiProperty() paidByUserId: number;
  @ApiProperty({ type: PaymentUserResponseDto })
  paidByUser: PaymentUserResponseDto;
  @ApiPropertyOptional({ type: [AttachmentDto], nullable: true }) attachment:
    AttachmentDto[] | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
