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
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Module } from '@nestjs/common';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ConversationType, MessageType } from '@prisma/client';
import { paginate, getPaginationSkipTake } from '../../common/helpers/pagination.helper';

export class CreateConversationDto {
  @ApiProperty({ enum: ConversationType, default: ConversationType.DIRECT })
  @IsEnum(ConversationType)
  type!: ConversationType;

  @ApiProperty({ example: ['recipient_user_id'] })
  @IsArray()
  @IsString({ each: true })
  recipientIds!: string[];

  @ApiPropertyOptional({ example: 'CSC 301 Study Team' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class SendMessageDto {
  @ApiPropertyOptional({ enum: MessageType, default: MessageType.TEXT })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiPropertyOptional({ example: 'Hey, are you going to the lecture?' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async createConversation(userId: string, dto: CreateConversationDto) {
    if (dto.type === ConversationType.DIRECT) {
      if (dto.recipientIds.length !== 1) {
        throw new BadRequestException('Direct conversations require exactly one recipient.');
      }
      const otherUserId = dto.recipientIds[0];
      if (otherUserId === userId) {
        throw new BadRequestException('Cannot start a direct conversation with yourself.');
      }

      // Check if direct conversation already exists between these two users
      const existing = await this.prisma.conversation.findFirst({
        where: {
          type: ConversationType.DIRECT,
          AND: [
            { members: { some: { userId } } },
            { members: { some: { userId: otherUserId } } },
          ],
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  profile: {
                    select: { firstName: true, lastName: true, avatarUrl: true },
                  },
                },
              },
            },
          },
        },
      });

      if (existing) return existing;

      // Create new direct conversation
      return this.prisma.conversation.create({
        data: {
          type: ConversationType.DIRECT,
          members: {
            create: [
              { userId, isAdmin: true },
              { userId: otherUserId, isAdmin: false },
            ],
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  profile: {
                    select: { firstName: true, lastName: true, avatarUrl: true },
                  },
                },
              },
            },
          },
        },
      });
    } else {
      // Group conversation
      const allMemberIds = Array.from(new Set([userId, ...dto.recipientIds]));
      return this.prisma.conversation.create({
        data: {
          type: ConversationType.GROUP,
          name: dto.name || 'New Group Chat',
          members: {
            create: allMemberIds.map((id) => ({
              userId: id,
              isAdmin: id === userId,
            })),
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  profile: {
                    select: { firstName: true, lastName: true, avatarUrl: true },
                  },
                },
              },
            },
          },
        },
      });
    }
  }

  async listConversations(userId: string) {
    const memberRecords = await this.prisma.conversationMember.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    profile: {
                      select: { firstName: true, lastName: true, avatarUrl: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    return memberRecords.map((m) => m.conversation);
  }

  async sendMessage(userId: string, conversationId: string, dto: SendMessageDto) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) throw new ForbiddenException('You are not a member of this conversation.');

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        type: dto.type || MessageType.TEXT,
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        metadata: dto.metadata as any,
        readBy: [userId],
      },
      include: {
        sender: {
          select: {
            id: true,
            profile: {
              select: { firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    // Cache last message on conversation and update timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        lastMessage: {
          content: dto.content,
          senderId: userId,
          type: dto.type,
          createdAt: message.createdAt,
        },
      },
    });

    return message;
  }

  async getMessages(
    userId: string,
    conversationId: string,
    query: { page?: number; limit?: number },
  ) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this conversation.');

    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId, isDeleted: false },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              profile: {
                select: { firstName: true, lastName: true, avatarUrl: true },
              },
            },
          },
        },
      }),
      this.prisma.message.count({
        where: { conversationId, isDeleted: false },
      }),
    ]);

    // Mark as read asynchronously
    void this.prisma.conversationMember.update({
      where: { id: member.id },
      data: { lastReadAt: new Date() },
    });

    return paginate(messages.reverse(), total, page, limit);
  }
}

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Start 1-to-1 direct chat or group conversation' })
  async createConversation(@CurrentUser() user: JwtPayload, @Body() dto: CreateConversationDto) {
    return this.messagesService.createConversation(user.sub, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List student active conversations' })
  async listConversations(@CurrentUser() user: JwtPayload) {
    return this.messagesService.listConversations(user.sub);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send text, media or file message' })
  async sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(user.sub, conversationId, dto);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Fetch message history in conversation' })
  async getMessages(
    @CurrentUser() user: JwtPayload,
    @Param('id') conversationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.messagesService.getMessages(user.sub, conversationId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }
}

@Module({
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
