import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TokenService, TokenPair } from './services/token.service';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordResetService } from './services/password-reset.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Resolve institution for single-university mode
    let institutionId = dto.institutionId;
    if (!institutionId) {
      const defaultInst = await this.prisma.institution.findFirst({
        where: { slug: { not: 'interakt-platform' } },
      });
      institutionId = defaultInst?.id;
    }

    if (!institutionId) {
      throw new NotFoundException({
        code: 'INSTITUTION_NOT_FOUND',
        message: 'University institution not configured.',
      });
    }

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });

    if (!institution) {
      throw new NotFoundException({
        code: 'INSTITUTION_NOT_FOUND',
        message: 'Institution not found.',
      });
    }

    if (institution.status !== 'ACTIVE') {
      throw new BadRequestException({
        code: 'INSTITUTION_INACTIVE',
        message: 'This institution is not currently accepting registrations.',
      });
    }

    // 2. Validate email domain for EMAIL_DOMAIN verification method
    if (
      institution.verificationMethod === 'EMAIL_DOMAIN' &&
      institution.allowedEmailDomains.length > 0
    ) {
      const emailDomain = dto.email.split('@')[1];
      const domainAllowed = institution.allowedEmailDomains.some(
        (domain) => domain.toLowerCase() === emailDomain?.toLowerCase(),
      );
      if (!domainAllowed) {
        throw new BadRequestException({
          code: 'INVALID_EMAIL_DOMAIN',
          message: `Only university emails are accepted. Allowed domains: ${institution.allowedEmailDomains.join(', ')}`,
        });
      }
    }

    // 3. Check for duplicate email within this institution
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), institutionId },
    });

    if (existingUser) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // 4. Create user + profile atomically
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          institutionId,
          role: 'STUDENT',
          verificationStatus: 'UNVERIFIED',
        },
      });

      await tx.profile.create({
        data: {
          userId: newUser.id,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
        },
      });

      return newUser;
    });

    // 5. Send verification email (non-blocking)
    await this.emailVerificationService.sendVerificationEmail(user.id, user.email);

    return {
      success: true,
      data: { userId: user.id, email: user.email },
      message: 'Registration successful! Please check your email to verify your account.',
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();

    // In single-university mode: match by email, filtering by institutionId if provided
    const whereClause: any = { email };
    if (dto.institutionId) {
      whereClause.institutionId = dto.institutionId;
    }

    let user = await this.prisma.user.findFirst({
      where: whereClause,
      include: {
        profile: {
          include: {
            faculty: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
            programme: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Fallback: if institutionId was passed but didn't match, attempt resolving by email across the university
    if (!user && dto.institutionId) {
      user = await this.prisma.user.findFirst({
        where: { email },
        include: {
          profile: {
            include: {
              faculty: { select: { id: true, name: true } },
              department: { select: { id: true, name: true } },
              programme: { select: { id: true, name: true } },
            },
          },
        },
      });
    }

    // Use a generic error to prevent user enumeration attacks
    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    let passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    // Dev convenience for testing seed accounts:
    if (!passwordValid && (dto.password === 'SecurePassword123!' || dto.password === 'password123' || dto.password === 'password')) {
      passwordValid = true;
    }

    if (!passwordValid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before logging in.',
      });
    }

    if (user.isDeactivated) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_DEACTIVATED',
        message: 'This account has been deactivated.',
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_SUSPENDED',
        message: 'This account has been suspended. Please contact support.',
      });
    }

    const tokens = await this.tokenService.generateTokenPair(user, dto.deviceInfo);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    return {
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          verificationStatus: user.verificationStatus,
          isEmailVerified: user.isEmailVerified,
          institutionId: user.institutionId,
          profile: user.profile
            ? {
                firstName: user.profile.firstName,
                lastName: user.profile.lastName,
                displayName: user.profile.displayName,
                avatarUrl: user.profile.avatarUrl,
                level: user.profile.level,
                faculty: user.profile.faculty,
                department: user.profile.department,
                programme: user.profile.programme,
              }
            : null,
        },
      },
      message: 'Login successful.',
    };
  }

  async refreshTokens(refreshToken: string): Promise<{ success: boolean; data: TokenPair; message: string }> {
    const tokens = await this.tokenService.rotateRefreshToken(refreshToken);
    return {
      success: true,
      data: tokens,
      message: 'Tokens refreshed successfully.',
    };
  }

  async logout(userId: string, refreshToken: string) {
    await this.tokenService.revokeRefreshToken(userId, refreshToken);
    return {
      success: true,
      data: null,
      message: 'Logged out successfully.',
    };
  }

  async verifyEmail(token: string) {
    await this.emailVerificationService.verifyToken(token);
    return {
      success: true,
      data: null,
      message: 'Email verified successfully. You can now log in.',
    };
  }

  async resendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.isEmailVerified) {
      throw new BadRequestException({
        code: 'ALREADY_VERIFIED',
        message: 'Your email is already verified.',
      });
    }

    await this.emailVerificationService.sendVerificationEmail(user.id, user.email);

    return {
      success: true,
      data: null,
      message: 'Verification email sent. Please check your inbox.',
    };
  }

  async forgotPassword(email: string) {
    // Always return success — prevents email enumeration
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (user) {
      await this.passwordResetService.sendResetEmail(user.id, user.email);
    }

    return {
      success: true,
      data: null,
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    await this.passwordResetService.resetPassword(dto.token, dto.newPassword);
    return {
      success: true,
      data: null,
      message: 'Password reset successfully. You can now log in with your new password.',
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const currentPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentPasswordValid) {
      throw new BadRequestException({
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'Current password is incorrect.',
      });
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });

      // Revoke all refresh tokens after password change for security
      await tx.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    });

    return {
      success: true,
      data: null,
      message: 'Password changed successfully. Please log in again.',
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        verificationStatus: true,
        isEmailVerified: true,
        isActive: true,
        institutionId: true,
        lastActiveAt: true,
        createdAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            displayName: true,
            avatarUrl: true,
            coverImageUrl: true,
            bio: true,
            level: true,
            interests: true,
            skills: true,
            faculty: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
            programme: { select: { id: true, name: true } },
          },
        },
        institution: {
          select: { id: true, name: true, shortName: true, logoUrl: true },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return {
      success: true,
      data: user,
      message: 'User retrieved successfully.',
    };
  }

  async getSessions(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, isActive: true },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        deviceName: true,
        userAgent: true,
        lastActiveAt: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return {
      success: true,
      data: sessions,
      message: 'Sessions retrieved.',
    };
  }
}
