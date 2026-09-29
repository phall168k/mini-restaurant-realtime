import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentRequestDto } from './dto/create-payment-request.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { UserResponseDto } from '../../system/user/dto/user-response.dto';
import { RoleEnum } from '../../../../libs/enums/role.enum';
import { PaymentMethodEnum } from '../../../../libs/enums/payment-method.enum';
import { PaymentStatus } from '../../../../libs/enums/payment-status.enum';
import { SWAGGER_TOKEN_NAME } from '../../../../swagger/config';
import { PaginationParams } from '../../../../libs/services/pagination/decorators/pagination-params.decorator';
import { type PaginationRequest } from '../../../../libs/services/pagination/interfaces/pagination-request.interface';
import { ApiPaginatedResponse } from '../../../../libs/services/pagination/decorators/api-paginated-response.decorador';

@ApiTags('Payments')
@ApiBearerAuth(SWAGGER_TOKEN_NAME)
@Controller({ path: 'admin/operation/payments', version: '1' })
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}
  @Post()
  @Roles(RoleEnum.CASHIER)
  @ApiOperation({
    summary: 'Pay a ready or served order',
    description:
      'Generates a payment number, calculates totals excluding canceled lines, and marks the order PAID atomically. Discount includes per-item discounts multiplied by quantity plus the order discount. paidByUserId comes from authentication. Cash may receive change; CARD/KHQR must match the total. Records payment only; does not charge a card or verify a bank transfer.',
  })
  @ApiBody({ type: CreatePaymentRequestDto })
  @ApiCreatedResponse({ type: PaymentResponseDto })
  @ApiNotFoundResponse({ description: 'Order or user not found' })
  @ApiConflictResponse({ description: 'Order already paid or not ready or served' })
  @ApiBadRequestResponse({
    description: 'Invalid amounts or insufficient payment',
  })
  @ApiUnprocessableEntityResponse({ description: 'Invalid request data' })
  create(
    @Body() dto: CreatePaymentRequestDto,
    @CurrentUser() user: UserResponseDto,
  ) {
    return this.paymentService.create(dto, user.id);
  }
  @Get()
  @Roles(RoleEnum.CASHIER, RoleEnum.ADMIN)
  @ApiOperation({ summary: 'List payments' })
  @ApiPaginatedResponse(PaymentResponseDto)
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'orderId', required: false, type: Number })
  @ApiQuery({ name: 'paidByUserId', required: false, type: Number })
  @ApiQuery({ name: 'paymentMethod', required: false, enum: PaymentMethodEnum })
  @ApiQuery({ name: 'paymentStatus', required: false, enum: PaymentStatus })
  findAll(@PaginationParams() pagination: PaginationRequest) {
    return this.paymentService.findAll(pagination);
  }
  @Get(':id')
  @Roles(RoleEnum.CASHIER, RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Get payment details' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: PaymentResponseDto })
  @ApiNotFoundResponse({ description: 'Payment not found' })
  @ApiBadRequestResponse({ description: 'Invalid payment ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentService.findOne(id);
  }
}
