import { Controller, Get, Post, Body, Param, Delete, ParseIntPipe, Put } from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleRequestDto } from './dto/create-role-request.dto';
import { UpdateRoleRequestDto } from './dto/update-role-request.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { ApiBearerAuth, ApiConflictResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SWAGGER_TOKEN_NAME } from '../../../../swagger/config';
import { type PaginationRequest } from '../../../../libs/services/pagination/interfaces/pagination-request.interface';
import { ApiPaginatedResponse } from '../../../../libs/services/pagination/decorators/api-paginated-response.decorador';
import { PaginationParams } from '../../../../libs/services/pagination/decorators/pagination-params.decorator';
import { PaginationResponseDto } from '../../../../libs/services/pagination/pagination-response.dto';
import { RoleSelectOptionResponseDto } from './dto/role-select-option-response.dto';
import { SuperUser } from '../../../auth/decorators/super-user.decorator';

@ApiTags('Roles')
@ApiBearerAuth(SWAGGER_TOKEN_NAME)
@Controller({
  path: 'admin/system/roles',
  version: '1',
})
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @SuperUser()
  @ApiOperation({ summary: 'Create a role' })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiConflictResponse({ description: 'This role already created', })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  public create(@Body() dto: CreateRoleRequestDto): Promise<RoleResponseDto> {
    return this.roleService.create(dto);
  }

  @Get()
  @SuperUser()
  @ApiOperation({ description: 'Find all roles' })
  @ApiPaginatedResponse(RoleResponseDto)
  @ApiQuery({ name: 'search',type: 'string', required: false, example: '', })
  public findAll(@PaginationParams() pagination: PaginationRequest): Promise<PaginationResponseDto<RoleResponseDto>> {
    return this.roleService.findAll(pagination);
  }

  @Get('select-options')
  @SuperUser()
  @ApiOperation({ summary: 'Find for select options' })
  @ApiOkResponse({ type: [RoleSelectOptionResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  public findForSelectOptions(): Promise<RoleSelectOptionResponseDto[]> {
    return this.roleService.findForSelectOptions();
  }

  @Get(':id')
  @SuperUser()
  @ApiOperation({ summary: 'Find a role by id' })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  public findOne(@Param('id', ParseIntPipe) id: number): Promise<RoleResponseDto> {
    return this.roleService.findOne(id);
  }

  @Put(':id')
  @SuperUser()
  @ApiOperation({ summary: 'Update a role by id' })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  public update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleRequestDto) {
    return this.roleService.update(id, dto);
  }

  @Delete(':id')
  @SuperUser()
  @ApiOperation({ summary: 'Delete a role by id' })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  public remove(@Param('id', ParseIntPipe) id: number): Promise<RoleResponseDto> {
    return this.roleService.remove(id);
  }
}
