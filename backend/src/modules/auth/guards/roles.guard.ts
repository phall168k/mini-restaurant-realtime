import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserResponseDto } from '../../admin/system/user/dto/user-response.dto';
import { UserEntity } from '../../admin/system/user/entities/user.entity';

type AuthenticatedRequest = {
  user?: UserResponseDto | UserEntity;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) throw new ForbiddenException();

    if (user.isSuperUser === true) {
      return true;
    }

    const roles = await user.roles;
    const hasRole = Array.isArray(roles) && roles.some(
      (role) => role.status === true && requiredRoles.includes(role.name),
    );
    if (!hasRole) {
      throw new ForbiddenException('Insufficient roles');
    }

    return true;
  }
}
