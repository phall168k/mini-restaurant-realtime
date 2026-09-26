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
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../../libs/services/pagination/decorators/api-paginated-response.decorador';
import { SWAGGER_TOKEN_NAME } from '../../../../swagger/config';
import { OrderResponseDto } from './dto/order-response.dto';
import { PaginationParams } from '../../../../libs/services/pagination/decorators/pagination-params.decorator';
import { type PaginationRequest } from '../../../../libs/services/pagination/interfaces/pagination-request.interface';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderRequestDto } from './dto/create-order-request.dto';
import { UpdateOrderRequestDto } from './dto/update-order-request.dto';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { UserResponseDto } from '../../system/user/dto/user-response.dto';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { RoleEnum } from '../../../../libs/enums/role.enum';
import { PaginationResponseDto } from '../../../../libs/services/pagination/pagination-response.dto';

@ApiTags('Orders')
@ApiBearerAuth(SWAGGER_TOKEN_NAME)
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
@Controller({
  path: 'admin/operation/orders',
  version: '1',
})
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @Roles(RoleEnum.RECEPTIONIST)
  @ApiOperation({
    summary: 'Create an order',
    description:
      'The authenticated user is recorded as the creator. PENDING orders run the kitchen submission workflow in the creation transaction; other statuses are saved without submission.',
  })
  @ApiBody({ type: CreateOrderRequestDto })
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiConflictResponse({ description: 'Order number already exists' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid order data' })
  public create(
    @Body() createOrderDto: CreateOrderRequestDto,
    @CurrentUser() user: UserResponseDto,
  ): Promise<OrderResponseDto> {
    return this.orderService.create({
      ...createOrderDto,
      createdByUserId: user.id,
    });
  }

  @Get()
  @Roles(RoleEnum.RECEPTIONIST, RoleEnum.COOKER, RoleEnum.CASHIER)
  @ApiOperation({
    summary: 'List orders',
    description: 'Search by order number, note, or restaurant table name/code.',
  })
  @ApiPaginatedResponse(OrderResponseDto)
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({
    name: 'orderNumber',
    type: String,
    required: false,
    description: 'Case-insensitive partial order number match',
  })
  @ApiQuery({ name: 'status', type: String, required: false })
  @ApiQuery({
    name: 'tableId',
    type: Number,
    required: false,
    description: 'Restaurant table ID',
  })
  @ApiQuery({
    name: 'skip',
    type: Number,
    required: false,
    description: 'Number of records to skip',
  })
  @ApiBadRequestResponse({ description: 'Invalid filter or sort value' })
  public findAll(
    @PaginationParams() pagination: PaginationRequest,
  ): Promise<PaginationResponseDto<OrderResponseDto>> {
    return this.orderService.findAll(pagination);
  }

  @Get(':id')
  @Roles(RoleEnum.RECEPTIONIST, RoleEnum.COOKER, RoleEnum.CASHIER)
  @ApiOperation({ summary: 'Find an order by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Order ID' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiBadRequestResponse({ description: 'Invalid order ID' })
  public findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrderResponseDto> {
    return this.orderService.findOne(id);
  }

  @Post(':id/submit')
  @Roles(RoleEnum.RECEPTIONIST)
  @ApiOperation({
    summary: 'Submit a draft order to the kitchen',
    description:
      'Changes DRAFT to PENDING. Existing order items and prices are preserved.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Order ID' })
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiConflictResponse({ description: 'Only draft orders can be submitted' })
  @ApiBadRequestResponse({ description: 'Invalid ID or empty order' })
  public submitToKitchen(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrderResponseDto> {
    return this.orderService.submitToKitchen(id);
  }

  @Put(':id')
  @Roles(RoleEnum.RECEPTIONIST)
  @ApiOperation({
    summary: 'Update an order',
    description:
      'Supplying items replaces the entire item list. Omit items to preserve existing lines.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Order ID' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiBadRequestResponse({ description: 'Invalid order ID' })
  @ApiBody({ type: UpdateOrderRequestDto })
  @ApiConflictResponse({ description: 'Order number already exists' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid order data' })
  public update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: UpdateOrderRequestDto,
  ): Promise<OrderResponseDto> {
    return this.orderService.update(id, updateOrderDto);
  }

  @Delete(':id')
  @Roles(RoleEnum.RECEPTIONIST)
  @ApiOperation({ summary: 'Soft-delete an order' })
  @ApiParam({ name: 'id', type: Number, description: 'Order ID' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiBadRequestResponse({ description: 'Invalid order ID' })
  public remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrderResponseDto> {
    return this.orderService.remove(id);
  }
}
