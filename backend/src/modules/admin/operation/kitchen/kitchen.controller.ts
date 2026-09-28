import { OrderItemStatus } from '../../../../libs/enums/order-item-status.enum';
import { OrderResponseDto } from '../order/dto/order-response.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiParam,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { SWAGGER_TOKEN_NAME } from '../../../../swagger/config';
import { ApiPaginatedResponse } from '../../../../libs/services/pagination/decorators/api-paginated-response.decorador';
import { PaginationParams } from '../../../../libs/services/pagination/decorators/pagination-params.decorator';
import type { PaginationRequest } from '../../../../libs/services/pagination/interfaces/pagination-request.interface';
import { PaginationResponseDto } from '../../../../libs/services/pagination/pagination-response.dto';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { RoleEnum } from '../../../../libs/enums/role.enum';
import { KitchenStatus } from '../../../../libs/enums/kitchen-status.enum';
import { UserResponseDto } from '../../system/user/dto/user-response.dto';
import { KitchenService } from './kitchen.service';
import { KitchenResponseDto } from './dto/kitchen-response.dto';
import { CreateKitchenRequestDto } from './dto/create-kitchen-request.dto';
import { UpdateKitchenRequestDto } from './dto/update-kitchen-request.dto';

@ApiTags('Kitchen')
@ApiBearerAuth(SWAGGER_TOKEN_NAME)
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
@Controller({ path: 'admin/operation/kitchens', version: '1' })
export class KitchenController {
  constructor(private readonly service: KitchenService) {}

  @Post()
  @Roles(RoleEnum.COOKER)
  @ApiOperation({
    summary: 'Create a kitchen record',
    description: 'The authenticated user is recorded as performedById.',
  })
  @ApiBody({ type: CreateKitchenRequestDto })
  @ApiCreatedResponse({ type: KitchenResponseDto })
  @ApiNotFoundResponse({ description: 'Order or user not found' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid kitchen data' })
  create(
    @Body() dto: CreateKitchenRequestDto,
    @CurrentUser() user: UserResponseDto,
  ): Promise<KitchenResponseDto> {
    return this.service.create({ ...dto, performedById: user.id });
  }

  @Get()
  @Roles(RoleEnum.COOKER, RoleEnum.RECEPTIONIST)
  @ApiOperation({
    summary: 'List kitchen records',
    description: 'Search by order number, performer username, or description.',
  })
  @ApiPaginatedResponse(KitchenResponseDto)
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'status', enum: KitchenStatus, required: false })
  @ApiQuery({ name: 'orderId', type: Number, required: false })
  @ApiQuery({ name: 'performedById', type: Number, required: false })
  findAll(
    @PaginationParams() pagination: PaginationRequest,
  ): Promise<PaginationResponseDto<KitchenResponseDto>> {
    return this.service.findAll(pagination);
  }

  @Get(':id')
  @Roles(RoleEnum.COOKER, RoleEnum.RECEPTIONIST)
  @ApiOperation({ summary: 'Find a kitchen record' })
  @ApiOkResponse({ type: KitchenResponseDto })
  @ApiNotFoundResponse({ description: 'Kitchen record not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<KitchenResponseDto> {
    return this.service.findOne(id);
  }

  @Put(':id')
  @Roles(RoleEnum.ADMIN, RoleEnum.COOKER)
  @ApiOperation({
    summary: 'Update a kitchen record',
    description:
      'Records the authenticated user as the performer of the update.',
  })
  @ApiBody({ type: UpdateKitchenRequestDto })
  @ApiOkResponse({ type: KitchenResponseDto })
  @ApiNotFoundResponse({
    description: 'Kitchen record, order, or user not found',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateKitchenRequestDto,
    @CurrentUser() user: UserResponseDto,
  ): Promise<KitchenResponseDto> {
    return this.service.update(id, dto, user.id);
  }

  @Patch('orders/:orderId/items/:itemId/start')
  @Roles(RoleEnum.COOKER)
  @ApiOperation({ summary: 'Set an order item to PREPARING' })
  @ApiParam({ name: 'orderId', type: Number })
  @ApiParam({ name: 'itemId', type: Number })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order, item, or user not found' })
  @ApiConflictResponse({ description: 'Invalid transition or no active kitchen record' })
  startItem(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @CurrentUser() user: UserResponseDto,
  ): Promise<OrderResponseDto> {
    return this.service.updateItemStatus(orderId, itemId, OrderItemStatus.PREPARING, user.id);
  }

  @Patch('orders/:orderId/items/:itemId/ready')
  @Roles(RoleEnum.COOKER)
  @ApiOperation({ summary: 'Set an order item to READY' })
  @ApiParam({ name: 'orderId', type: Number })
  @ApiParam({ name: 'itemId', type: Number })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order, item, or user not found' })
  @ApiConflictResponse({ description: 'Invalid transition or no active kitchen record' })
  readyItem(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @CurrentUser() user: UserResponseDto,
  ): Promise<OrderResponseDto> {
    return this.service.updateItemStatus(orderId, itemId, OrderItemStatus.READY, user.id);
  }

  @Patch('orders/:orderId/ready')
  @Roles(RoleEnum.COOKER)
  @ApiOperation({ summary: 'Mark all pending and preparing items of an order ready' })
  @ApiParam({ name: 'orderId', type: Number })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order or user not found' })
  @ApiConflictResponse({ description: 'Order has no active kitchen record or cannot be marked ready' })
  makeAllReady(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() user: UserResponseDto,
  ): Promise<OrderResponseDto> {
    return this.service.makeAllReady(orderId, user.id);
  }

  @Delete(':id')
  @Roles(RoleEnum.COOKER)
  @ApiOperation({ summary: 'Soft-delete a kitchen record' })
  @ApiOkResponse({ type: KitchenResponseDto })
  @ApiNotFoundResponse({ description: 'Kitchen record not found' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<KitchenResponseDto> {
    return this.service.remove(id);
  }
}
