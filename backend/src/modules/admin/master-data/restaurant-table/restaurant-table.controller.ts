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
import { RestaurantTableResponseDto } from './dto/restaurant-table-response.dto';
import { RestaurantTableSelectOptionResponseDto } from './dto/restaurant-table-select-option-response.dto';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { UserResponseDto } from '../../system/user/dto/user-response.dto';
import { PaginationParams } from '../../../../libs/services/pagination/decorators/pagination-params.decorator';
import { type PaginationRequest } from '../../../../libs/services/pagination/interfaces/pagination-request.interface';
import { Controller, Get, Post, Body, Param, Delete, ParseIntPipe, Put } from '@nestjs/common';
import { RestaurantTableService } from './restaurant-table.service';
import { CreateRestaurantTableRequestDto } from './dto/create-restaurant-table-request.dto';
import { UpdateRestaurantTableRequestDto } from './dto/update-restaurant-table-request.dto';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { RestaurantTableStatuseEnum } from '../../../../libs/enums/restaurant-table-status.enum';
import { RoleEnum } from '../../../../libs/enums/role.enum';
import { PaginationResponseDto } from '../../../../libs/services/pagination/pagination-response.dto';

@ApiTags('Restaurant tables')
@ApiBearerAuth(SWAGGER_TOKEN_NAME)
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
@Controller({
  path: 'admin/master-data/restaurant-tables',
  version: '1',
})
export class RestaurantTableController {
  constructor(private readonly restaurantTableService: RestaurantTableService) {}

  @Post()
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Create a restaurant-table', description: 'The authenticated user is recorded as the creator.' })
  @ApiBody({ type: CreateRestaurantTableRequestDto })
  @ApiCreatedResponse({ type: RestaurantTableResponseDto })
  @ApiConflictResponse({ description: 'Restaurant table code already exists' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid restaurant-table data' })
  public create(@Body() createRestaurantTableDto: CreateRestaurantTableRequestDto, @CurrentUser() user: UserResponseDto): Promise<RestaurantTableResponseDto> {
    return this.restaurantTableService.create({ ...createRestaurantTableDto, createdByUserId: user.id });
  }

  @Get()
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'List restaurant-tables', description: 'Search by code, name, note, or creator username.' })
  @ApiPaginatedResponse(RestaurantTableResponseDto)
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'code', type: String, required: false, description: 'Case-insensitive partial code match' })
  @ApiQuery({ name: 'status', enum: RestaurantTableStatuseEnum, required: false })
  @ApiQuery({ name: 'active', type: Boolean, required: false })
  @ApiQuery({ name: 'createdByUserId', type: Number, required: false, description: 'Creator user ID' })
  @ApiQuery({ name: 'createdAt', type: String, required: false, description: 'Inclusive start,end date range', example: '2026-01-01T00:00:00Z,2026-12-31T23:59:59Z' })
  @ApiQuery({ name: 'skip', type: Number, required: false, description: 'Number of records to skip' })
  @ApiBadRequestResponse({ description: 'Invalid filter or sort value' })
  public findAll(@PaginationParams() pagination: PaginationRequest): Promise<PaginationResponseDto<RestaurantTableResponseDto>>  {
    return this.restaurantTableService.findAll(pagination);
  }

  @Get('select-options')
  @ApiOperation({ summary: 'List restaurant-table select options', description: 'Returns restaurant-table IDs, codes, names, capacity, and status ordered by sort_order.' })
  @ApiOkResponse({ type: [RestaurantTableSelectOptionResponseDto] })
  public findForSelectOptions(): Promise<RestaurantTableSelectOptionResponseDto[]> {
    return this.restaurantTableService.findForSelectOptions();
  }

  @Get(':id')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Find a restaurant-table by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'RestaurantTable ID' })
  @ApiOkResponse({ type: RestaurantTableResponseDto })
  @ApiNotFoundResponse({ description: 'Restaurant table not found' })
  @ApiBadRequestResponse({ description: 'Invalid restaurant-table ID' })
  public findOne(@Param('id', ParseIntPipe) id: number): Promise<RestaurantTableResponseDto> {
    return this.restaurantTableService.findOne(id);
  }

  @Put(':id')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Update a restaurant-table' })
  @ApiParam({ name: 'id', type: Number, description: 'RestaurantTable ID' })
  @ApiOkResponse({ type: RestaurantTableResponseDto })
  @ApiNotFoundResponse({ description: 'Restaurant table not found' })
  @ApiBadRequestResponse({ description: 'Invalid restaurant-table ID' })
  @ApiBody({ type: UpdateRestaurantTableRequestDto })
  @ApiConflictResponse({ description: 'Restaurant table code already exists' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid restaurant-table data' })
  public update(@Param('id', ParseIntPipe) id: number, @Body() updateRestaurantTableDto: UpdateRestaurantTableRequestDto): Promise<RestaurantTableResponseDto> {
    return this.restaurantTableService.update(id, updateRestaurantTableDto);
  }

  @Delete(':id')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Soft-delete a restaurant-table' })
  @ApiParam({ name: 'id', type: Number, description: 'RestaurantTable ID' })
  @ApiOkResponse({ type: RestaurantTableResponseDto })
  @ApiNotFoundResponse({ description: 'Restaurant table not found' })
  @ApiBadRequestResponse({ description: 'Invalid restaurant-table ID' })
  public remove(@Param('id', ParseIntPipe) id: number): Promise<RestaurantTableResponseDto> {
    return this.restaurantTableService.remove(id);
  }
}
