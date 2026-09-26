import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ReactionType } from '@prisma/client';

export class ReactDto {
  @ApiProperty({ enum: ReactionType, default: ReactionType.LIKE })
  @IsEnum(ReactionType)
  type!: ReactionType;
}

@Injectable()
export class ReactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async reactToPost(userId: string, postId: string, type: ReactionType) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found.');

    const existing = await this.prisma.reaction.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      if (existing.type === type) {
        // Toggle off
        await this.prisma.$transaction([
          this.prisma.reaction.delete({ where: { id: existing.id } }),
          this.prisma.post.update({
            where: { id: postId },
            data: { reactionCount: { decrement: 1 } },
          }),
        ]);
        return { success: true, reacted: false, type: null };
      } else {
        // Switch reaction type
        const updated = await this.prisma.reaction.update({
          where: { id: existing.id },
          data: { type },
        });
        return { success: true, reacted: true, type: updated.type };
      }
    }

    // New reaction
    const [reaction] = await this.prisma.$transaction([
      this.prisma.reaction.create({
        data: { userId, postId, type },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { reactionCount: { increment: 1 } },
      }),
    ]);

    return { success: true, reacted: true, type: reaction.type };
  }

  async reactToComment(userId: string, commentId: string, type: ReactionType) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found.');

    const existing = await this.prisma.reaction.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existing) {
      if (existing.type === type) {
        await this.prisma.$transaction([
          this.prisma.reaction.delete({ where: { id: existing.id } }),
          this.prisma.comment.update({
            where: { id: commentId },
            data: { reactionCount: { decrement: 1 } },
          }),
        ]);
        return { success: true, reacted: false, type: null };
      } else {
        const updated = await this.prisma.reaction.update({
          where: { id: existing.id },
          data: { type },
        });
        return { success: true, reacted: true, type: updated.type };
      }
    }

    const [reaction] = await this.prisma.$transaction([
      this.prisma.reaction.create({
        data: { userId, commentId, type },
      }),
      this.prisma.comment.update({
        where: { id: commentId },
        data: { reactionCount: { increment: 1 } },
      }),
    ]);

    return { success: true, reacted: true, type: reaction.type };
  }
}

@ApiTags('reactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('reactions')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post('posts/:postId')
  @ApiOperation({ summary: 'React or change reaction on a post (toggles if same type)' })
  async reactPost(
    @CurrentUser() user: JwtPayload,
    @Param('postId') postId: string,
    @Body() dto: ReactDto,
  ) {
    return this.reactionsService.reactToPost(user.sub, postId, dto.type);
  }

  @Post('comments/:commentId')
  @ApiOperation({ summary: 'React to a comment' })
  async reactComment(
    @CurrentUser() user: JwtPayload,
    @Param('commentId') commentId: string,
    @Body() dto: ReactDto,
  ) {
    return this.reactionsService.reactToComment(user.sub, commentId, dto.type);
  }
}

@Module({
  controllers: [ReactionsController],
  providers: [ReactionsService],
  exports: [ReactionsService],
})
export class ReactionsModule {}
