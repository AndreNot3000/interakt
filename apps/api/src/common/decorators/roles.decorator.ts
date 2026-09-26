import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to specific user roles.
 * Used with the global RolesGuard.
 *
 * @example
 * @Roles(UserRole.UNIVERSITY_ADMIN, UserRole.SUPER_ADMIN)
 * @Delete(':id')
 * async delete() {}
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
