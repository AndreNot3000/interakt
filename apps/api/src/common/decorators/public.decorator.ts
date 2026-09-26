import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as publicly accessible (no JWT required).
 * Used with the global JwtAuthGuard to opt out of authentication.
 *
 * @example
 * @Public()
 * @Post('register')
 * async register() {}
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
