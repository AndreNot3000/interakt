import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@prisma/client';
import { addDays } from 'date-fns';

export interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
  deviceName?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async generateTokenPair(user: User, deviceInfo?: DeviceInfo): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createRefreshToken(user.id, deviceInfo);

    return { accessToken, refreshToken };
  }

  /**
   * Rotates the refresh token — revokes the old one and issues a new pair.
   * Detects token reuse (theft) by checking if a revoked token is being used.
   */
  async rotateRefreshToken(incomingToken: string): Promise<TokenPair> {
    const storedToken = await this.findRefreshToken(incomingToken);

    if (!storedToken) {
      this.logger.warn('Refresh token not found — possible theft attempt');
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired session. Please log in again.',
      });
    }

    if (storedToken.isRevoked) {
      // Revoked token used — possible theft — revoke entire family
      this.logger.warn(
        `Revoked refresh token used for userId=${storedToken.userId} family=${storedToken.family}`,
      );
      await this.prisma.refreshToken.updateMany({
        where: { family: storedToken.family },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException({
        code: 'TOKEN_REUSE_DETECTED',
        message: 'Session compromised. All sessions have been invalidated. Please log in again.',
      });
    }

    if (new Date() > storedToken.expiresAt) {
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException({
        code: 'SESSION_EXPIRED',
        message: 'Session expired. Please log in again.',
      });
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: storedToken.userId },
    });

    if (!user || !user.isActive || user.isDeactivated) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_INACTIVE',
        message: 'This account is no longer active.',
      });
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId,
    };

    const newAccessToken = this.jwtService.sign(payload);
    const newRefreshToken = uuidv4();
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    const expiresAt = this.getRefreshTokenExpiry();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newRefreshTokenHash,
        family: storedToken.family, // Maintain the token family
        expiresAt,
        userAgent: storedToken.userAgent,
        ipAddress: storedToken.ipAddress,
      },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async revokeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const storedToken = await this.findRefreshToken(refreshToken);
    if (storedToken && storedToken.userId === userId) {
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  private async createRefreshToken(userId: string, deviceInfo?: DeviceInfo): Promise<string> {
    const token = uuidv4();
    const tokenHash = await bcrypt.hash(token, 10);
    const family = uuidv4(); // Each new login session starts a new token family
    const expiresAt = this.getRefreshTokenExpiry();

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        family,
        expiresAt,
        userAgent: deviceInfo?.userAgent,
        ipAddress: deviceInfo?.ipAddress,
      },
    });

    await this.prisma.session.create({
      data: {
        userId,
        userAgent: deviceInfo?.userAgent,
        ipAddress: deviceInfo?.ipAddress,
        deviceName: deviceInfo?.deviceName,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Finds a refresh token by verifying argon2 hash against recent non-revoked tokens.
   *
   * Trade-off: This scans recent tokens for hash verification. For very high scale,
   * encode the token ID in the refresh token itself to enable O(1) lookup.
   */
  private async findRefreshToken(token: string) {
    const candidates = await this.prisma.refreshToken.findMany({
      where: {
        expiresAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Include recently expired
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    for (const candidate of candidates) {
      try {
        const matches = await bcrypt.compare(token, candidate.tokenHash);
        if (matches) return candidate;
      } catch {
        // Hash format mismatch — skip
      }
    }

    return null;
  }

  private getRefreshTokenExpiry(): Date {
    const expiresIn = this.configService.get<string>('jwt.refreshExpiresIn', '7d');
    const days = parseInt(expiresIn.replace('d', ''), 10) || 7;
    return addDays(new Date(), days);
  }
}
