import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { addHours } from 'date-fns';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async sendResetEmail(userId: string, email: string): Promise<void> {
    // Invalidate previous reset tokens
    await this.prisma.passwordReset.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = uuidv4();
    const expiresAt = addHours(new Date(), 1); // 1 hour — short window for security

    await this.prisma.passwordReset.create({
      data: { userId, token, expiresAt },
    });

    const clientUrl = this.configService.get<string>('app.clientUrl', 'http://localhost:3000');
    const resetUrl = `${clientUrl}/auth/reset-password?token=${token}`;

    await this.emailService.sendEmail({
      to: email,
      subject: 'Reset your Interakt password',
      html: this.buildEmailHtml(resetUrl),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!record || record.usedAt) {
      throw new BadRequestException({
        code: 'INVALID_RESET_TOKEN',
        message: 'Invalid or already used password reset link.',
      });
    }

    if (new Date() > record.expiresAt) {
      throw new BadRequestException({
        code: 'RESET_TOKEN_EXPIRED',
        message: 'This password reset link has expired. Please request a new one.',
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordReset.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });

      // Revoke all refresh tokens — force re-login after password reset
      await tx.refreshToken.updateMany({
        where: { userId: record.userId },
        data: { isRevoked: true },
      });
    });
  }

  private buildEmailHtml(resetUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:#0f172a;padding:32px 40px;">
              <div style="font-size:28px;font-weight:800;color:#fff;">Interakt</div>
              <div style="font-size:13px;color:#64748b;margin-top:4px;">Your Digital Campus</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h1 style="font-size:24px;font-weight:700;color:#0f172a;margin:0 0 16px;">Reset your password</h1>
              <p style="color:#64748b;line-height:1.7;margin:0 0 32px;">
                We received a request to reset your Interakt password. 
                Click the button below to create a new password.
              </p>
              <a href="${resetUrl}"
                 style="display:inline-block;background:#0f172a;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">
                Reset Password
              </a>
              <div style="margin-top:32px;padding:16px;background:#fef3c7;border-radius:8px;border:1px solid #fcd34d;">
                <p style="color:#92400e;font-size:13px;margin:0;line-height:1.6;">
                  ⚠️ This link expires in 1 hour. If you didn't request a password reset, 
                  please ignore this email — your password will not change.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f1f5f9;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} Interakt.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
