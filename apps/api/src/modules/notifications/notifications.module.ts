import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { IsString, IsNotEmpty, IsEnum, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { NotificationType } from '@prisma/client';
import { paginate, getPaginationSkipTake } from '../../common/helpers/pagination.helper';

export class RegisterFcmTokenDto {
  @ApiProperty({ example: 'fcm_token_string...' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'android' })
  @IsString()
  @IsNotEmpty()
  platform!: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(userId: string, query: { page?: number; limit?: number }) {
    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { recipientId: userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              profile: {
                select: { firstName: true, lastName: true, avatarUrl: true },
              },
            },
          },
        },
      }),
      this.prisma.notification.count({ where: { recipientId: userId } }),
      this.prisma.notification.count({ where: { recipientId: userId, read: false } }),
    ]);

    const result = paginate(notifications, total, page, limit);
    return { ...result, unreadCount };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notif = await this.prisma.notification.findFirst({
      where: { id: notificationId, recipientId: userId },
    });
    if (!notif) throw new NotFoundException('Notification not found.');

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return { success: true, message: 'All notifications marked as read.' };
  }

  async registerFcmToken(userId: string, dto: RegisterFcmTokenDto) {
    await this.prisma.fcmToken.upsert({
      where: { token: dto.token },
      update: { userId, platform: dto.platform, updatedAt: new Date() },
      create: { userId, token: dto.token, platform: dto.platform },
    });
    return { success: true, message: 'Device registered for push notifications.' };
  }
}

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get student notification inbox with unread count' })
  async getNotifications(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.getNotifications(user.sub, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark single notification as read' })
  async markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.notificationsService.markAsRead(user.sub, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllAsRead(user.sub);
  }

  @Post('device-token')
  @ApiOperation({ summary: 'Register FCM device token for mobile push notifications' })
  async registerToken(@CurrentUser() user: JwtPayload, @Body() dto: RegisterFcmTokenDto) {
    return this.notificationsService.registerFcmToken(user.sub, dto);
  }
}

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
