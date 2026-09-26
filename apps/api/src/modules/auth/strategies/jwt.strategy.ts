import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret', 'fallback-secret'),
    });
  }

  /**
   * Called by Passport after JWT signature verification.
   *
   * We re-fetch the user's role from the database here to ensure
   * role changes take effect immediately without waiting for token expiry.
   * This prevents privilege escalation via stale tokens.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        isActive: true,
        isDeactivated: true,
        role: true,
        institutionId: true,
      },
    });

    if (!user || !user.isActive || user.isDeactivated) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    // Return payload with DB-sourced role — never trust role from token alone
    return {
      ...payload,
      role: user.role,
      institutionId: user.institutionId,
    };
  }
}
