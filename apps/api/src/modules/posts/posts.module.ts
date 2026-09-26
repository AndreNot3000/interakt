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
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PostType, PostVisibility, PostStatus, UserRole } from '@prisma/client';
import { paginate, getPaginationSkipTake } from '../../common/helpers/pagination.helper';

export class CreatePostDto {
  @ApiPropertyOptional({ enum: PostType, default: PostType.TEXT })
  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @ApiPropertyOptional({ enum: PostVisibility, default: PostVisibility.INSTITUTION })
  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;

  @ApiPropertyOptional({ example: { options: ['Option A', 'Option B'], votes: {} } })
  @IsOptional()
  @IsObject()
  pollData?: Record<string, unknown>;

  // Context attachments
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class UpdatePostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];
}

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(institutionId: string, authorId: string, dto: CreatePostDto) {
    // Validate target context belongs to this institution
    if (dto.courseId) {
      const course = await this.prisma.course.findFirst({
        where: { id: dto.courseId, institutionId },
      });
      if (!course) throw new NotFoundException('Course not found.');
    }

    if (dto.groupId) {
      const group = await this.prisma.group.findFirst({
        where: { id: dto.groupId, institutionId },
      });
      if (!group) throw new NotFoundException('Group not found.');
    }

    if (dto.organizationId) {
      const org = await this.prisma.organization.findFirst({
        where: { id: dto.organizationId, institutionId },
      });
      if (!org) throw new NotFoundException('Organization not found.');
    }

    return this.prisma.post.create({
      data: {
        institutionId,
        authorId,
        type: dto.type || PostType.TEXT,
        content: dto.content,
        mediaUrls: dto.mediaUrls || [],
        visibility: dto.visibility || PostVisibility.INSTITUTION,
        pollData: dto.pollData as any,
        courseId: dto.courseId,
        groupId: dto.groupId,
        organizationId: dto.organizationId,
      },
      include: {
        author: {
          select: {
            id: true,
            verificationStatus: true,
            role: true,
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
        course: { select: { id: true, code: true, name: true } },
        group: { select: { id: true, name: true, slug: true, avatarUrl: true } },
        organization: { select: { id: true, name: true, slug: true, isOfficial: true, avatarUrl: true } },
      },
    });
  }

  async getFeed(
    institutionId: string,
    userId: string,
    query: {
      page?: number;
      limit?: number;
      courseId?: string;
      groupId?: string;
      organizationId?: string;
      authorId?: string;
      type?: PostType;
      scope?: string;
    },
  ) {
    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const where: any = {
      institutionId,
      status: PostStatus.ACTIVE,
    };

    if (query.courseId) where.courseId = query.courseId;
    if (query.groupId) where.groupId = query.groupId;
    if (query.organizationId) where.organizationId = query.organizationId;
    if (query.authorId) where.authorId = query.authorId;
    if (query.type) where.type = query.type;

    // Multi-scope filtering based on student academic context
    if (query.scope && query.scope.toUpperCase() !== 'CAMPUS') {
      const userWithProfile = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          courseEnrollments: { select: { courseId: true } },
        },
      });

      const enrolledCourseIds = userWithProfile?.courseEnrollments?.map((e) => e.courseId) || [];
      const userLevel = userWithProfile?.profile?.level;
      const userDeptId = userWithProfile?.profile?.departmentId;
      const userFacultyId = userWithProfile?.profile?.facultyId;

      switch (query.scope.toUpperCase()) {
        case 'ENROLLED_COURSES':
        case 'COURSES':
          where.courseId = { in: enrolledCourseIds };
          break;

        case 'LEVEL':
          if (userLevel) {
            where.OR = [
              { author: { profile: { level: userLevel } } },
              { course: { level: userLevel } },
            ];
          } else if (enrolledCourseIds.length > 0) {
            where.courseId = { in: enrolledCourseIds };
          }
          break;

        case 'DEPARTMENT':
          if (userDeptId) {
            where.OR = [
              { author: { profile: { departmentId: userDeptId } } },
              { course: { programme: { departmentId: userDeptId } } },
            ];
          }
          break;

        case 'FACULTY':
          if (userFacultyId) {
            where.OR = [
              { author: { profile: { facultyId: userFacultyId } } },
              { course: { programme: { department: { facultyId: userFacultyId } } } },
            ];
          }
          break;
      }
    }

    // Filter out posts from blocked users
    const blocks = await this.prisma.userBlock.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    });
    const blockedIds = blocks.map((b) => b.blockedId);
    if (blockedIds.length > 0) {
      where.authorId = { notIn: blockedIds };
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          author: {
            select: {
              id: true,
              verificationStatus: true,
              role: true,
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
          course: { select: { id: true, code: true, name: true } },
          group: { select: { id: true, name: true, slug: true, avatarUrl: true } },
          organization: { select: { id: true, name: true, slug: true, isOfficial: true, avatarUrl: true } },
          reactions: {
            where: { userId },
            select: { type: true },
          },
          bookmarks: {
            where: { userId },
            select: { id: true },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    // Format posts with user-specific reaction and bookmark flags
    const formatted = posts.map((post) => ({
      ...post,
      userReaction: post.reactions[0]?.type || null,
      isBookmarked: post.bookmarks.length > 0,
      reactions: undefined,
      bookmarks: undefined,
    }));

    return paginate(formatted, total, page, limit);
  }

  async findOne(institutionId: string, id: string, userId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, institutionId, status: PostStatus.ACTIVE },
      include: {
        author: {
          select: {
            id: true,
            verificationStatus: true,
            role: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                displayName: true,
                avatarUrl: true,
                level: true,
                faculty: { select: { name: true } },
                department: { select: { name: true } },
              },
            },
          },
        },
        course: { select: { id: true, code: true, name: true } },
        group: { select: { id: true, name: true, slug: true, avatarUrl: true } },
        organization: { select: { id: true, name: true, slug: true, isOfficial: true, avatarUrl: true } },
        reactions: {
          where: { userId },
          select: { type: true },
        },
        bookmarks: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    if (!post) throw new NotFoundException('Post not found.');

    return {
      ...post,
      userReaction: post.reactions[0]?.type || null,
      isBookmarked: post.bookmarks.length > 0,
      reactions: undefined,
      bookmarks: undefined,
    };
  }

  async update(institutionId: string, id: string, userId: string, dto: UpdatePostDto) {
    const post = await this.prisma.post.findFirst({
      where: { id, institutionId },
    });
    if (!post) throw new NotFoundException('Post not found.');

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own posts.');
    }

    return this.prisma.post.update({
      where: { id },
      data: {
        content: dto.content,
        mediaUrls: dto.mediaUrls,
        editedAt: new Date(),
      },
    });
  }

  async delete(institutionId: string, id: string, userId: string, userRole: UserRole) {
    const post = await this.prisma.post.findFirst({
      where: { id, institutionId },
    });
    if (!post) throw new NotFoundException('Post not found.');

    const isAuthor = post.authorId === userId;
    const isAdmin = userRole === UserRole.UNIVERSITY_ADMIN || userRole === UserRole.SUPER_ADMIN;

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException('You do not have permission to delete this post.');
    }

    await this.prisma.post.delete({ where: { id } });
    return { success: true, message: 'Post deleted successfully.' };
  }

  async bookmark(userId: string, postId: string) {
    await this.prisma.bookmark.upsert({
      where: { userId_postId: { userId, postId } },
      update: {},
      create: { userId, postId },
    });
    return { success: true, message: 'Post bookmarked.' };
  }

  async unbookmark(userId: string, postId: string) {
    await this.prisma.bookmark.deleteMany({
      where: { userId, postId },
    });
    return { success: true, message: 'Bookmark removed.' };
  }

  async listBookmarked(
    userId: string,
    institutionId: string,
    query: { page?: number; limit?: number; type?: PostType } = {},
  ) {
    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const where: any = {
      userId,
      post: {
        institutionId,
        status: PostStatus.ACTIVE,
        ...(query.type ? { type: query.type } : {}),
      },
    };

    const [bookmarks, total] = await Promise.all([
      this.prisma.bookmark.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          post: {
            include: {
              course: { select: { id: true, code: true, name: true } },
              group: { select: { id: true, name: true, slug: true, avatarUrl: true } },
              organization: {
                select: { id: true, name: true, slug: true, isOfficial: true, avatarUrl: true },
              },
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
        },
      }),
      this.prisma.bookmark.count({ where }),
    ]);

    const formatted = bookmarks.map((b) => ({
      ...b.post,
      isBookmarked: true,
      userReaction: b.post.reactions[0]?.type || null,
      reactions: undefined,
      bookmarkedAt: b.createdAt,
    }));

    return paginate(formatted, total, page, limit);
  }
}

@ApiTags('posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @ApiOperation({ summary: 'Create campus post (general, course discussion, group, or club)' })
  async createPost(@CurrentUser() user: JwtPayload, @Body() dto: CreatePostDto) {
    return this.postsService.create(user.institutionId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get unified campus home feed with scope filters' })
  async getFeedRoot(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('courseId') courseId?: string,
    @Query('groupId') groupId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('authorId') authorId?: string,
    @Query('type') type?: PostType,
    @Query('scope') scope?: string,
  ) {
    return this.postsService.getFeed(user.institutionId, user.sub, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      courseId,
      groupId,
      organizationId,
      authorId,
      type,
      scope,
    });
  }

  @Get('feed')
  @ApiOperation({ summary: 'Get unified campus home feed with scope filters' })
  async getFeed(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('courseId') courseId?: string,
    @Query('groupId') groupId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('authorId') authorId?: string,
    @Query('type') type?: PostType,
    @Query('scope') scope?: string,
  ) {
    return this.postsService.getFeed(user.institutionId, user.sub, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      courseId,
      groupId,
      organizationId,
      authorId,
      type,
      scope,
    });
  }

  @Get('bookmarks')
  @ApiOperation({ summary: 'Get saved/bookmarked campus posts' })
  async getBookmarks(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: PostType,
  ) {
    return this.postsService.listBookmarked(user.sub, user.institutionId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      type,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single post details with reaction state' })
  async getPost(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.postsService.findOne(user.institutionId, id, user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit own post' })
  async updatePost(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.update(user.institutionId, id, user.sub, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete post (author or university admin)' })
  async deletePost(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.postsService.delete(user.institutionId, id, user.sub, user.role);
  }

  @Post(':id/bookmark')
  @ApiOperation({ summary: 'Bookmark post' })
  async bookmarkPost(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.postsService.bookmark(user.sub, id);
  }

  @Delete(':id/bookmark')
  @ApiOperation({ summary: 'Remove bookmark from post' })
  async unbookmarkPost(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.postsService.unbookmark(user.sub, id);
  }
}

@Module({
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
