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
import { CategoryResponseDto } from './dto/category-response.dto';
import { CategorySelectOptionResponseDto } from './dto/category-select-option-response.dto';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { UserResponseDto } from '../../system/user/dto/user-response.dto';
import { PaginationParams } from '../../../../libs/services/pagination/decorators/pagination-params.decorator';
import { type PaginationRequest } from '../../../../libs/services/pagination/interfaces/pagination-request.interface';
import { Controller, Get, Post, Body, Param, Delete, ParseIntPipe, Put } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryRequestDto } from './dto/create-category-request.dto';
import { UpdateCategoryRequestDto } from './dto/update-category-request.dto';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { RoleEnum } from '../../../../libs/enums/role.enum';
import { PaginationResponseDto } from '../../../../libs/services/pagination/pagination-response.dto';

@ApiTags('Categories')
@ApiBearerAuth(SWAGGER_TOKEN_NAME)
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
@Controller({
  path: 'admin/master-data/categories',
  version: '1',
})
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Create a category', description: 'The authenticated user is recorded as the creator.' })
  @ApiBody({ type: CreateCategoryRequestDto })
  @ApiCreatedResponse({ type: CategoryResponseDto })
  @ApiConflictResponse({ description: 'Category code or name already exists' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid category data' })
  public create(@Body() createCategoryDto: CreateCategoryRequestDto, @CurrentUser() user: UserResponseDto): Promise<CategoryResponseDto> {
    return this.categoryService.create({ ...createCategoryDto, createdByUserId: user.id });
  }

  @Get()
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'List categories', description: 'Search by code, English or Khmer name, description, or creator username.' })
  @ApiPaginatedResponse(CategoryResponseDto)
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'code', type: String, required: false, description: 'Case-insensitive partial code match' })
  @ApiQuery({ name: 'status', type: Boolean, required: false })
  @ApiQuery({ name: 'createdByUserId', type: Number, required: false, description: 'Creator user ID' })
  @ApiQuery({ name: 'createdAt', type: String, required: false, description: 'Inclusive start,end date range', example: '2026-01-01T00:00:00Z,2026-12-31T23:59:59Z' })
  @ApiQuery({ name: 'skip', type: Number, required: false, description: 'Number of records to skip' })
  @ApiBadRequestResponse({ description: 'Invalid filter or sort value' })
  public findAll(@PaginationParams() pagination: PaginationRequest): Promise<PaginationResponseDto<CategoryResponseDto>>  {
    return this.categoryService.findAll(pagination);
  }

  @Get('select-options')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'List category select options', description: 'Returns category IDs, codes, and names ordered by English name.' })
  @ApiOkResponse({ type: [CategorySelectOptionResponseDto] })
  public findForSelectOptions(): Promise<CategorySelectOptionResponseDto[]> {
    return this.categoryService.findForSelectOptions();
  }

  @Get(':id')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Find a category by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Category ID' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiBadRequestResponse({ description: 'Invalid category ID' })
  public findOne(@Param('id', ParseIntPipe) id: number): Promise<CategoryResponseDto> {
    return this.categoryService.findOne(id);
  }

  @Put(':id')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', type: Number, description: 'Category ID' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiBadRequestResponse({ description: 'Invalid category ID' })
  @ApiBody({ type: UpdateCategoryRequestDto })
  @ApiConflictResponse({ description: 'Category code or name already exists' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid category data' })
  public update(@Param('id', ParseIntPipe) id: number, @Body() updateCategoryDto: UpdateCategoryRequestDto): Promise<CategoryResponseDto> {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Soft-delete a category' })
  @ApiParam({ name: 'id', type: Number, description: 'Category ID' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiBadRequestResponse({ description: 'Invalid category ID' })
  public remove(@Param('id', ParseIntPipe) id: number): Promise<CategoryResponseDto> {
    return this.categoryService.remove(id);
  }
}
