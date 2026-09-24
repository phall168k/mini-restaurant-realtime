import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../../libs/services/pagination/decorators/api-paginated-response.decorador';
import { PaginationParams } from '../../../../libs/services/pagination/decorators/pagination-params.decorator';
import { type PaginationRequest } from '../../../../libs/services/pagination/interfaces/pagination-request.interface';
import { PaginationResponseDto } from '../../../../libs/services/pagination/pagination-response.dto';
import { SWAGGER_TOKEN_NAME } from '../../../../swagger/config';
import { CreateUserRequestDto } from './dto/create-user-request.dto';
import { UpdateUserRequestDto } from './dto/update-user-request.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserSelectOptionResponseDto } from './dto/user-select-option-response.dto';
import { UserService } from './user.service';
import { SuperUser } from '../../../auth/decorators/super-user.decorator';

@ApiTags('Users')
@ApiBearerAuth(SWAGGER_TOKEN_NAME)
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Access denied' })
@Controller({ path: 'admin/system/users', version: '1' })
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @SuperUser()
  @ApiOperation({ summary: 'Create a user' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: 'Username already exists' })
  create(@Body() dto: CreateUserRequestDto): Promise<UserResponseDto> {
    return this.userService.create(dto);
  }

  @Get()
  @SuperUser()
  @ApiOperation({ summary: 'Get a paginated user list' })
  @ApiPaginatedResponse(UserResponseDto)
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'username', type: String, required: false })
  @ApiQuery({ name: 'status', type: Boolean, required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  @ApiQuery({
    name: 'createdAt',
    type: String,
    required: false,
    description: 'Inclusive start,end date range',
  })
  findAll(
    @PaginationParams() pagination: PaginationRequest,
  ): Promise<PaginationResponseDto<UserResponseDto>> {
    return this.userService.findAll(pagination);
  }

  @Get('select-options')
  @SuperUser()
  @ApiOperation({ summary: 'Get user select options' })
  @ApiOkResponse({ type: UserSelectOptionResponseDto, isArray: true })
  findForSelectOptions(): Promise<UserSelectOptionResponseDto[]> {
    return this.userService.findForSelectOptions();
  }

  @Get(':id')
  @SuperUser()
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<UserResponseDto> {
    return this.userService.findOne(id);
  }

  @Put(':id')
  @SuperUser()
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({ description: 'Username already exists' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRequestDto,
  ): Promise<UserResponseDto> {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @SuperUser()
  @ApiOperation({ summary: 'Soft-delete a user' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<UserResponseDto> {
    return this.userService.remove(id);
  }
}
