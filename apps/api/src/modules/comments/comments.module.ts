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
import { Injectable, NotFoundException } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { UserRole } from '@prisma/client';
import { paginate, getPaginationSkipTake } from '../../common/helpers/pagination.helper';

export class CreateCommentDto {
  @ApiProperty({ example: 'This explanation of tree traversal was super helpful!' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ description: 'Parent comment ID if this is a nested reply' })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content!: string;
}

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(institutionId: string, postId: string, authorId: string, dto: CreateCommentDto) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, institutionId },
    });
    if (!post) throw new NotFoundException('Post not found.');

    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.postId !== postId) {
        throw new NotFoundException('Parent comment not found on this post.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          postId,
          authorId,
          content: dto.content,
          parentId: dto.parentId,
        },
        include: {
          author: {
            select: {
              id: true,
              verificationStatus: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      // Update post comment count atomically
      await tx.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      });

      // If reply, update parent reply count
      if (dto.parentId) {
        await tx.comment.update({
          where: { id: dto.parentId },
          data: { replyCount: { increment: 1 } },
        });
      }

      return comment;
    });
  }

  async findByPost(
    institutionId: string,
    postId: string,
    userId: string,
    query: { page?: number; limit?: number },
  ) {
    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: {
          postId,
          parentId: null, // Only fetch top-level comments; replies are fetched on demand
          isRemoved: false,
          post: { institutionId },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              role: true,
              verificationStatus: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  displayName: true,
                  avatarUrl: true,
                  level: true,
                },
              },
            },
          },
          replies: {
            where: { isRemoved: false },
            orderBy: { createdAt: 'asc' },
            include: {
              author: {
                select: {
                  id: true,
                  role: true,
                  verificationStatus: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      displayName: true,
                      avatarUrl: true,
                      level: true,
                    },
                  },
                },
              },
              reactions: {
                where: { userId },
                select: { type: true },
              },
            },
          },
          reactions: {
            where: { userId },
            select: { type: true },
          },
        },
      }),
      this.prisma.comment.count({
        where: { postId, parentId: null, isRemoved: false },
      }),
    ]);

    const formatted = comments.map((c) => ({
      ...c,
      userReaction: c.reactions[0]?.type || null,
      reactions: undefined,
      replies: c.replies?.map((r: any) => ({
        ...r,
        userReaction: r.reactions?.[0]?.type || null,
        reactions: undefined,
      })) || [],
    }));

    return paginate(formatted, total, page, limit);
  }

  async getReplies(commentId: string, userId: string, query: { page?: number; limit?: number }) {
    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const [replies, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { parentId: commentId, isRemoved: false },
        skip,
        take,
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: {
              id: true,
              role: true,
              verificationStatus: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  displayName: true,
                  avatarUrl: true,
                  level: true,
                },
              },
            },
          },
          reactions: {
            where: { userId },
            select: { type: true },
          },
        },
      }),
      this.prisma.comment.count({
        where: { parentId: commentId, isRemoved: false },
      }),
    ]);

    const formatted = replies.map((r) => ({
      ...r,
      userReaction: r.reactions[0]?.type || null,
      reactions: undefined,
    }));

    return paginate(formatted, total, page, limit);
  }

  async update(commentId: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found.');

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comment.');
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { content: dto.content, isEdited: true },
    });
  }

  async delete(commentId: string, userId: string, userRole: UserRole) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found.');

    const isAuthor = comment.authorId === userId;
    const isAdmin = userRole === UserRole.UNIVERSITY_ADMIN || userRole === UserRole.SUPER_ADMIN;

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException('Permission denied.');
    }

    await this.prisma.$transaction([
      this.prisma.comment.update({
        where: { id: commentId },
        data: { isRemoved: true, content: '[Comment removed by author]' },
      }),
      this.prisma.post.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      }),
    ]);

    return { success: true, message: 'Comment removed.' };
  }
}

@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('posts/:postId/comments')
  @ApiOperation({ summary: 'Add a comment or nested reply to a post' })
  async createComment(
    @CurrentUser() user: JwtPayload,
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(user.institutionId, postId, user.sub, dto);
  }

  @Get('posts/:postId/comments')
  @ApiOperation({ summary: 'Paginated top-level comments for a post' })
  async getComments(
    @CurrentUser() user: JwtPayload,
    @Param('postId') postId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.commentsService.findByPost(user.institutionId, postId, user.sub, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('comments/:commentId/replies')
  @ApiOperation({ summary: 'Get nested replies for a comment' })
  async getReplies(
    @CurrentUser() user: JwtPayload,
    @Param('commentId') commentId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.commentsService.getReplies(commentId, user.sub, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Patch('comments/:commentId')
  @ApiOperation({ summary: 'Edit comment' })
  async updateComment(
    @CurrentUser() user: JwtPayload,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.update(commentId, user.sub, dto);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete comment' })
  async deleteComment(
    @CurrentUser() user: JwtPayload,
    @Param('commentId') commentId: string,
  ) {
    return this.commentsService.delete(commentId, user.sub, user.role);
  }
}

@Module({
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
