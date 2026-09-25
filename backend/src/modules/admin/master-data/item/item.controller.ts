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
import { ItemResponseDto } from './dto/item-response.dto';
import { ItemSelectOptionResponseDto } from './dto/item-select-option-response.dto';
import { PaginationParams } from '../../../../libs/services/pagination/decorators/pagination-params.decorator';
import { type PaginationRequest } from '../../../../libs/services/pagination/interfaces/pagination-request.interface';
import { Controller, Get, Post, Body, Param, Delete, ParseIntPipe, Put, Query } from '@nestjs/common';
import { ItemService } from './item.service';
import { CreateItemRequestDto } from './dto/create-item-request.dto';
import { UpdateItemRequestDto } from './dto/update-item-request.dto';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { UserResponseDto } from '../../system/user/dto/user-response.dto';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { RoleEnum } from '../../../../libs/enums/role.enum';
import { PaginationResponseDto } from '../../../../libs/services/pagination/pagination-response.dto';

@ApiTags('Items')
@ApiBearerAuth(SWAGGER_TOKEN_NAME)
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
@Controller({
  path: 'admin/master-data/items',
  version: '1',
})
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Post()
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Create an item', description: 'The authenticated user is recorded as the creator.' })
  @ApiBody({ type: CreateItemRequestDto })
  @ApiCreatedResponse({ type: ItemResponseDto })
  @ApiConflictResponse({ description: 'Item code already exists' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid item data' })
  public create(@Body() createItemDto: CreateItemRequestDto, @CurrentUser() user: UserResponseDto): Promise<ItemResponseDto> {
    return this.itemService.create({ ...createItemDto, createdByUserId: user.id });
  }

  @Get()
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'List items', description: 'Search by code, English or Khmer name, description, or category name.' })
  @ApiPaginatedResponse(ItemResponseDto)
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'code', type: String, required: false, description: 'Case-insensitive partial code match' })
  @ApiQuery({ name: 'status', type: Boolean, required: false })
  @ApiQuery({ name: 'categoryId', type: Number, required: false, description: 'Category ID' })
  @ApiQuery({ name: 'createdAt', type: String, required: false, description: 'Inclusive start,end date range', example: '2026-01-01T00:00:00Z,2026-12-31T23:59:59Z' })
  @ApiQuery({ name: 'skip', type: Number, required: false, description: 'Number of records to skip' })
  @ApiBadRequestResponse({ description: 'Invalid filter or sort value' })
  public findAll(@PaginationParams() pagination: PaginationRequest): Promise<PaginationResponseDto<ItemResponseDto>>  {
    return this.itemService.findAll(pagination);
  }

  @Get('select-options')
  @ApiOperation({ summary: 'List item select options', description: 'Returns item IDs, codes, and names ordered by English name.' })
  @ApiOkResponse({ type: [ItemSelectOptionResponseDto] })
  @ApiQuery({ name: 'categoryId', type: Number, required: false, description: 'Filter by category ID' })
  @ApiBadRequestResponse({ description: 'categoryId must be a positive integer' })
  public findForSelectOptions(@Query('categoryId', new ParseIntPipe({ optional: true })) categoryId?: number): Promise<ItemSelectOptionResponseDto[]> {
    return this.itemService.findForSelectOptions(categoryId);
  }

  @Get(':id')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Find a item by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Item ID' })
  @ApiOkResponse({ type: ItemResponseDto })
  @ApiNotFoundResponse({ description: 'Item not found' })
  @ApiBadRequestResponse({ description: 'Invalid item ID' })
  public findOne(@Param('id', ParseIntPipe) id: number): Promise<ItemResponseDto> {
    return this.itemService.findOne(id);
  }

  @Put(':id')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Update a item' })
  @ApiParam({ name: 'id', type: Number, description: 'Item ID' })
  @ApiOkResponse({ type: ItemResponseDto })
  @ApiNotFoundResponse({ description: 'Item not found' })
  @ApiBadRequestResponse({ description: 'Invalid item ID' })
  @ApiBody({ type: UpdateItemRequestDto })
  @ApiConflictResponse({ description: 'Item code already exists' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid item data' })
  public update(@Param('id', ParseIntPipe) id: number, @Body() updateItemDto: UpdateItemRequestDto): Promise<ItemResponseDto> {
    return this.itemService.update(id, updateItemDto);
  }

  @Delete(':id')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Soft-delete a item' })
  @ApiParam({ name: 'id', type: Number, description: 'Item ID' })
  @ApiOkResponse({ type: ItemResponseDto })
  @ApiNotFoundResponse({ description: 'Item not found' })
  @ApiBadRequestResponse({ description: 'Invalid item ID' })
  public remove(@Param('id', ParseIntPipe) id: number): Promise<ItemResponseDto> {
    return this.itemService.remove(id);
  }
}
