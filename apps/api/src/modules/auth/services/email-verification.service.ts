import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { addHours } from 'date-fns';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    // Invalidate any existing unused tokens for this user
    await this.prisma.emailVerification.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = uuidv4();
    const expiresAt = addHours(new Date(), 24);

    await this.prisma.emailVerification.create({
      data: { userId, token, expiresAt },
    });

    const apiUrl = this.configService.get<string>('app.apiUrl', 'http://localhost:3001');
    const verificationUrl = `${apiUrl}/api/v1/auth/verify-email?token=${token}`;

    await this.emailService.sendEmail({
      to: email,
      subject: 'Verify your Interakt account',
      html: this.buildEmailHtml(verificationUrl),
    });
  }

  async verifyToken(token: string): Promise<void> {
    const record = await this.prisma.emailVerification.findUnique({
      where: { token },
    });

    if (!record) {
      throw new BadRequestException({
        code: 'INVALID_VERIFICATION_TOKEN',
        message: 'Invalid verification link.',
      });
    }

    if (record.usedAt) {
      throw new BadRequestException({
        code: 'TOKEN_ALREADY_USED',
        message: 'This verification link has already been used.',
      });
    }

    if (new Date() > record.expiresAt) {
      throw new BadRequestException({
        code: 'VERIFICATION_TOKEN_EXPIRED',
        message: 'This verification link has expired. Please request a new one.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerification.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      await tx.user.update({
        where: { id: record.userId },
        data: { isEmailVerified: true },
      });
    });
  }

  private buildEmailHtml(verificationUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Interakt Account</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:32px 40px;">
              <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Interakt</div>
              <div style="font-size:13px;color:#64748b;margin-top:4px;">Your Digital Campus</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="font-size:24px;font-weight:700;color:#0f172a;margin:0 0 16px;">Verify your email address</h1>
              <p style="color:#64748b;line-height:1.7;margin:0 0 32px;">
                Welcome to Interakt! You're one step away from accessing your digital campus. 
                Click the button below to verify your email address.
              </p>
              <a href="${verificationUrl}" 
                 style="display:inline-block;background:#0f172a;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:0.2px;">
                Verify Email Address
              </a>
              <p style="color:#94a3b8;font-size:13px;margin:32px 0 0;line-height:1.6;">
                This link expires in 24 hours.<br>
                If you didn't create an Interakt account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f1f5f9;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Interakt. All rights reserved.
              </p>
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
