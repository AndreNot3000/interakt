import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { FastifyRequest } from 'fastify';

/**
 * Applied globally via APP_GUARD in AppModule.
 *
 * Server-side role validation — never trusts client-submitted roles.
 * The JWT strategy re-fetches the role from the database on every request.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No roles required — allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest & { user: JwtPayload }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Access denied.',
      });
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.',
      });
    }

    return true;
  }
}
