import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { UserRole } from '@prisma/client';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * TenantGuard ensures that the authenticated user only accesses data
 * belonging to their own university/institution.
 * SUPER_ADMIN is exempt and can operate cross-tenant.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<
      FastifyRequest & {
        user: JwtPayload;
        params?: Record<string, string>;
        query?: Record<string, string>;
        body?: Record<string, unknown>;
      }
    >();

    const user = request.user;
    if (!user) {
      return true; // Let JwtAuthGuard handle unauthenticated
    }

    // Super Admin has global tenant oversight
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Extract any target institutionId from path params, query params, or body
    const targetInstitutionId =
      request.params?.institutionId ||
      request.query?.institutionId ||
      (request.body && typeof request.body === 'object' && (request.body as any).institutionId);

    if (targetInstitutionId && targetInstitutionId !== user.institutionId) {
      throw new ForbiddenException({
        code: 'TENANT_MISMATCH',
        message: 'You cannot access or mutate resources outside your institution.',
      });
    }

    return true;
  }
}
