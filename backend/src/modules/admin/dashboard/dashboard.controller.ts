import { Controller, Get, ParseEnumPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RoleEnum } from '../../../libs/enums/role.enum';
import { UserResponseDto } from '../system/user/dto/user-response.dto';
import { SWAGGER_TOKEN_NAME } from '../../../swagger/config';

@ApiTags('Dashboard')
@ApiBearerAuth(SWAGGER_TOKEN_NAME)
@Controller({ path: 'admin/dashboard', version: '1' })
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @Roles(RoleEnum.ADMIN, RoleEnum.RECEPTIONIST, RoleEnum.COOKER, RoleEnum.CASHIER)
  @ApiOperation({ summary: 'Role-specific dashboard; daily metrics use Asia/Phnom_Penh. Cashier collections are scoped to the authenticated cashier.' })
  @ApiQuery({ name: 'role', enum: RoleEnum, required: false })
  summary(@CurrentUser() user: UserResponseDto, @Query('role', new ParseEnumPipe(RoleEnum, { optional: true })) role?: RoleEnum) {
    return this.dashboard.summary(user, role);
  }
}
