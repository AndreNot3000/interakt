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
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
  Module,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { GroupType, GroupMemberRole, MembershipStatus } from '@prisma/client';
import { createSlug } from '../../common/helpers/slugify.helper';
import { paginate, getPaginationSkipTake } from '../../common/helpers/pagination.helper';

export class CreateGroupDto {
  @ApiProperty({ example: 'CSC 301 Peer Study Circle' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Daily algorithm problem walkthroughs and exam review sessions.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: GroupType, default: GroupType.ACADEMIC })
  @IsOptional()
  @IsEnum(GroupType)
  type?: GroupType;

  @ApiPropertyOptional({ description: 'Associated course ID for course-linked study circles' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;
}

export class UpdateGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: GroupType })
  @IsOptional()
  @IsEnum(GroupType)
  type?: GroupType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;
}

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(institutionId: string, userId: string, dto: CreateGroupDto) {
    const slugBase = createSlug(dto.name);
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    // If courseId provided, ensure course exists in this institution
    if (dto.courseId) {
      const course = await this.prisma.course.findFirst({
        where: { id: dto.courseId, institutionId },
      });
      if (!course) {
        throw new NotFoundException(`Linked course '${dto.courseId}' was not found.`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          institutionId,
          name: dto.name,
          slug,
          description: dto.description,
          type: dto.type || GroupType.OTHER,
          courseId: dto.courseId || null,
          avatarUrl: dto.avatarUrl,
          coverImageUrl: dto.coverImageUrl,
          isPrivate: dto.isPrivate || false,
          requireApproval: dto.requireApproval || false,
          memberCount: 1,
        },
        include: {
          course: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId,
          role: GroupMemberRole.OWNER,
          status: MembershipStatus.ACTIVE,
        },
      });

      return group;
    });
  }

  async findAll(
    institutionId: string,
    query: {
      page?: number;
      limit?: number;
      type?: GroupType;
      courseId?: string;
      search?: string;
      myGroupsOnly?: boolean;
      userId?: string;
    },
  ) {
    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const where: any = { institutionId };
    if (query.type) where.type = query.type;
    if (query.courseId) where.courseId = query.courseId;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.myGroupsOnly && query.userId) {
      where.members = {
        some: { userId: query.userId, status: MembershipStatus.ACTIVE },
      };
    }

    const [groups, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        skip,
        take,
        orderBy: { memberCount: 'desc' },
        include: {
          course: {
            select: { id: true, name: true, code: true, level: true },
          },
          members: query.userId
            ? {
                where: { userId: query.userId, status: MembershipStatus.ACTIVE },
                select: { role: true, status: true },
              }
            : false,
          _count: {
            select: {
              posts: true,
              events: true,
              resources: true,
              members: { where: { status: MembershipStatus.ACTIVE } },
            },
          },
        },
      }),
      this.prisma.group.count({ where }),
    ]);

    const formatted = groups.map((g: any) => {
      const userMembership = g.members && g.members.length > 0 ? g.members[0] : null;
      return {
        ...g,
        isMember: Boolean(userMembership),
        membershipRole: userMembership?.role || null,
        members: undefined,
      };
    });

    return paginate(formatted, total, page, limit);
  }

  async findOne(institutionId: string, id: string, userId?: string) {
    const group = await this.prisma.group.findFirst({
      where: {
        institutionId,
        OR: [{ id }, { slug: id }],
      },
      include: {
        course: {
          select: { id: true, name: true, code: true, units: true, level: true },
        },
        _count: {
          select: {
            members: { where: { status: MembershipStatus.ACTIVE } },
            posts: true,
            events: true,
            resources: true,
          },
        },
      },
    });

    if (!group) throw new NotFoundException('Group not found.');

    let membership = null;
    if (userId) {
      membership = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: group.id, userId } },
      });
    }

    const isMember = Boolean(membership && membership.status === MembershipStatus.ACTIVE);
    const hasAccess = !group.isPrivate || isMember;

    return { ...group, membership, hasAccess };
  }

  async join(institutionId: string, groupId: string, userId: string) {
    const group = await this.prisma.group.findFirst({
      where: {
        institutionId,
        OR: [{ id: groupId }, { slug: groupId }],
      },
    });
    if (!group) throw new NotFoundException('Group not found.');

    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId } },
    });

    if (existing && existing.status === MembershipStatus.ACTIVE) {
      throw new ConflictException('Already a member of this group.');
    }

    const status = group.requireApproval
      ? MembershipStatus.PENDING
      : MembershipStatus.ACTIVE;

    const member = await this.prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId } },
      update: { status, role: GroupMemberRole.MEMBER },
      create: { groupId: group.id, userId, status, role: GroupMemberRole.MEMBER },
    });

    if (status === MembershipStatus.ACTIVE && (!existing || existing.status !== MembershipStatus.ACTIVE)) {
      await this.prisma.group.update({
        where: { id: group.id },
        data: { memberCount: { increment: 1 } },
      });
    }

    return {
      success: true,
      data: member,
      message: group.requireApproval
        ? 'Join request submitted for moderator approval.'
        : 'Joined group successfully.',
    };
  }

  async leave(institutionId: string, groupId: string, userId: string) {
    const group = await this.prisma.group.findFirst({
      where: {
        institutionId,
        OR: [{ id: groupId }, { slug: groupId }],
      },
    });
    if (!group) throw new NotFoundException('Group not found.');

    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId } },
    });

    if (!member || member.status !== MembershipStatus.ACTIVE) {
      throw new BadRequestException('You are not an active member of this group.');
    }

    if (member.role === GroupMemberRole.OWNER) {
      throw new BadRequestException('Group owners cannot leave. Transfer ownership first.');
    }

    await this.prisma.$transaction([
      this.prisma.groupMember.delete({
        where: { id: member.id },
      }),
      this.prisma.group.update({
        where: { id: group.id },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);

    return { success: true, message: 'You have left the group.' };
  }

  async getMembers(
    institutionId: string,
    groupId: string,
    query: { page?: number; limit?: number },
  ) {
    const group = await this.prisma.group.findFirst({
      where: {
        institutionId,
        OR: [{ id: groupId }, { slug: groupId }],
      },
    });
    if (!group) throw new NotFoundException('Group not found.');

    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const [members, total] = await Promise.all([
      this.prisma.groupMember.findMany({
        where: { groupId: group.id, status: MembershipStatus.ACTIVE },
        skip,
        take,
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        include: {
          user: {
            select: {
              id: true,
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
        },
      }),
      this.prisma.groupMember.count({
        where: { groupId: group.id, status: MembershipStatus.ACTIVE },
      }),
    ]);

    return paginate(members, total, page, limit);
  }

  async getPosts(
    institutionId: string,
    groupId: string,
    query: { page?: number; limit?: number },
    userId?: string,
  ) {
    const group = await this.prisma.group.findFirst({
      where: {
        institutionId,
        OR: [{ id: groupId }, { slug: groupId }],
      },
    });
    if (!group) throw new NotFoundException('Group not found.');

    if (group.isPrivate && userId) {
      const membership = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: group.id, userId } },
      });
      if (!membership || membership.status !== MembershipStatus.ACTIVE) {
        throw new ForbiddenException('This study circle is private. You must be an accepted member to view discussions.');
      }
    }

    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { groupId: group.id, institutionId, status: 'ACTIVE' },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
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
                  level: true,
                },
              },
            },
          },
          _count: {
            select: {
              comments: true,
              reactions: true,
            },
          },
        },
      }),
      this.prisma.post.count({
        where: { groupId: group.id, institutionId, status: 'ACTIVE' },
      }),
    ]);

    return paginate(posts, total, page, limit);
  }

  async getResources(
    institutionId: string,
    groupId: string,
    query: { page?: number; limit?: number },
    userId?: string,
  ) {
    const group = await this.prisma.group.findFirst({
      where: {
        institutionId,
        OR: [{ id: groupId }, { slug: groupId }],
      },
    });
    if (!group) throw new NotFoundException('Group not found.');

    if (group.isPrivate && userId) {
      const membership = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: group.id, userId } },
      });
      if (!membership || membership.status !== MembershipStatus.ACTIVE) {
        throw new ForbiddenException('This study circle is private. You must be an accepted member to view shared materials.');
      }
    }

    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const [resources, total] = await Promise.all([
      this.prisma.resource.findMany({
        where: { groupId: group.id, institutionId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          uploader: {
            select: {
              id: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.resource.count({
        where: { groupId: group.id, institutionId },
      }),
    ]);

    return paginate(resources, total, page, limit);
  }

  async getEvents(
    institutionId: string,
    groupId: string,
    query: { page?: number; limit?: number },
    userId?: string,
  ) {
    const group = await this.prisma.group.findFirst({
      where: { institutionId, OR: [{ id: groupId }, { slug: groupId }] },
    });
    if (!group) throw new NotFoundException('Group not found.');

    if (group.isPrivate && userId) {
      const membership = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: group.id, userId } },
      });
      if (!membership || membership.status !== MembershipStatus.ACTIVE) {
        throw new ForbiddenException('This study circle is private. You must be an accepted member to view scheduled sessions.');
      }
    }

    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where: { groupId: group.id, institutionId, status: 'PUBLISHED' },
        skip,
        take,
        orderBy: { startDate: 'asc' },
        include: {
          attendees: userId ? { where: { userId }, select: { status: true } } : false,
        },
      }),
      this.prisma.event.count({
        where: { groupId: group.id, institutionId, status: 'PUBLISHED' },
      }),
    ]);

    const formatted = events.map((e: any) => ({
      ...e,
      userStatus: e.attendees?.[0]?.status || null,
      attendees: undefined,
    }));

    return paginate(formatted, total, page, limit);
  }

  async getAnnouncements(
    institutionId: string,
    groupId: string,
    query: { page?: number; limit?: number },
  ) {
    const group = await this.prisma.group.findFirst({
      where: { institutionId, OR: [{ id: groupId }, { slug: groupId }] },
    });
    if (!group) throw new NotFoundException('Group not found.');

    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const [announcements, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where: { groupId: group.id, institutionId },
        skip,
        take,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.announcement.count({
        where: { groupId: group.id, institutionId },
      }),
    ]);

    return paginate(announcements, total, page, limit);
  }

  async update(institutionId: string, groupId: string, userId: string, dto: UpdateGroupDto) {
    const group = await this.prisma.group.findFirst({
      where: {
        institutionId,
        OR: [{ id: groupId }, { slug: groupId }],
      },
    });
    if (!group) throw new NotFoundException('Group not found.');

    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId } },
    });

    if (!member || (member.role !== GroupMemberRole.OWNER && member.role !== GroupMemberRole.MODERATOR)) {
      throw new ForbiddenException('Only group owners or moderators can edit group details.');
    }

    return this.prisma.group.update({
      where: { id: group.id },
      data: dto,
    });
  }
}

@ApiTags('groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create student group (academic, social, hobby, etc.)' })
  async createGroup(@CurrentUser() user: JwtPayload, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(user.institutionId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List campus student groups with filters' })
  async listGroups(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: GroupType,
    @Query('courseId') courseId?: string,
    @Query('search') search?: string,
    @Query('myGroupsOnly') myGroupsOnly?: boolean,
  ) {
    return this.groupsService.findAll(user.institutionId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      type,
      courseId,
      search,
      myGroupsOnly: myGroupsOnly === true || String(myGroupsOnly) === 'true',
      userId: user.sub,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group details and membership status' })
  async getGroup(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.groupsService.findOne(user.institutionId, id, user.sub);
  }

  @Get(':id/posts')
  @ApiOperation({ summary: 'List group discussions / posts' })
  async getGroupPosts(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.groupsService.getPosts(user.institutionId, id, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    }, user.sub);
  }

  @Get(':id/resources')
  @ApiOperation({ summary: 'List group study materials / files' })
  async getGroupResources(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.groupsService.getResources(user.institutionId, id, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    }, user.sub);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'List group scheduled study sessions and events' })
  async getGroupEvents(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.groupsService.getEvents(user.institutionId, id, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    }, user.sub);
  }

  @Get(':id/announcements')
  @ApiOperation({ summary: 'List group official notices & announcements' })
  async getGroupAnnouncements(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.groupsService.getAnnouncements(user.institutionId, id, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update group details (Owner/Mod only)' })
  async updateGroup(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.update(user.institutionId, id, user.sub, dto);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join or request to join a student group' })
  async joinGroup(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.groupsService.join(user.institutionId, id, user.sub);
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Leave student group' })
  async leaveGroup(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.groupsService.leave(user.institutionId, id, user.sub);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List group members and leadership' })
  async getMembers(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.groupsService.getMembers(user.institutionId, id, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }
}

@Module({
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
