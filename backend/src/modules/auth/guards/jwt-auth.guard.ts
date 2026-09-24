import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isSkipAuth = this.reflector.get<boolean>(
      'skipAuth',
      context.getHandler(),
    );
    if (isSkipAuth) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    error: Error | null,
    user: TUser | false,
  ): TUser {
    if (error || !user) {
      throw error || new UnauthorizedException();
    }
    return user;
  }
}
