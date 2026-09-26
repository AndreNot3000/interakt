import { UserRole } from '@prisma/client';

export interface JwtPayload {
  /** User ID (subject) */
  sub: string;
  email: string;
  /** Role — always re-validated from DB in JWT strategy, never trusted from token alone */
  role: UserRole;
  /** Tenant isolation — every request is scoped to this institution */
  institutionId: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
}
