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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Module } from '@nestjs/common';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUrl,
  IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, OrganizationStatus, GroupMemberRole, MembershipStatus } from '@prisma/client';
import { createSlug } from '../../common/helpers/slugify.helper';
import { paginate, getPaginationSkipTake } from '../../common/helpers/pagination.helper';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'University Developers Club' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Technology & Coding' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: 'https://unilagdevclub.org' })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiPropertyOptional({ example: 'contact@unilagdevclub.org' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

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
  @IsUrl()
  websiteUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(institutionId: string, userId: string, dto: CreateOrganizationDto) {
    const slugBase = createSlug(dto.name);
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          institutionId,
          name: dto.name,
          slug,
          description: dto.description,
          category: dto.category,
          avatarUrl: dto.avatarUrl,
          coverImageUrl: dto.coverImageUrl,
          websiteUrl: dto.websiteUrl,
          email: dto.email,
          status: OrganizationStatus.PENDING_VERIFICATION,
          memberCount: 1,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          role: GroupMemberRole.OWNER,
          status: MembershipStatus.ACTIVE,
        },
      });

      return org;
    });
  }

  async findAll(
    institutionId: string,
    query: {
      page?: number;
      limit?: number;
      category?: string;
      search?: string;
      verifiedOnly?: boolean;
    },
    userId?: string,
  ) {
    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const where: any = { institutionId };
    if (query.category && query.category !== 'ALL') where.category = query.category;
    if (query.verifiedOnly) where.isOfficial = true;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [orgs, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take,
        orderBy: [{ isOfficial: 'desc' }, { memberCount: 'desc' }],
        include: {
          _count: {
            select: { posts: true, events: true, resources: true, announcements: true, members: true },
          },
          members: userId
            ? {
                where: { userId, status: MembershipStatus.ACTIVE },
                select: { role: true, status: true },
              }
            : false,
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    const data = orgs.map((org: any) => {
      const isMember = Boolean(org.members && org.members.length > 0);
      const membershipRole = org.members?.[0]?.role || null;
      const { members, ...rest } = org;
      return {
        ...rest,
        isMember,
        membershipRole,
      };
    });

    return paginate(data, total, page, limit);
  }

  async findOne(institutionId: string, id: string, userId?: string) {
    const org = await this.prisma.organization.findFirst({
      where: {
        institutionId,
        OR: [{ id }, { slug: id }],
      },
      include: {
        members: {
          where: { status: MembershipStatus.ACTIVE },
          take: 12,
          include: {
            user: {
              select: {
                id: true,
                verificationStatus: true,
                profile: {
                  select: { firstName: true, lastName: true, avatarUrl: true, studentId: true },
                },
              },
            },
          },
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        },
        _count: {
          select: {
            members: { where: { status: MembershipStatus.ACTIVE } },
            posts: true,
            events: true,
            resources: true,
            announcements: true,
          },
        },
      },
    });

    if (!org) throw new NotFoundException('Organization not found.');

    let membership = null;
    if (userId) {
      membership = await this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: org.id, userId } },
      });
    }

    return {
      ...org,
      isMember: Boolean(membership && membership.status === MembershipStatus.ACTIVE),
      membership,
    };
  }

  async findMembers(institutionId: string, orgIdOrSlug: string, query: { page?: number; limit?: number }) {
    const org = await this.prisma.organization.findFirst({
      where: { institutionId, OR: [{ id: orgIdOrSlug }, { slug: orgIdOrSlug }] },
      select: { id: true },
    });
    if (!org) throw new NotFoundException('Organization not found.');

    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const where = { organizationId: org.id, status: MembershipStatus.ACTIVE };
    const [members, total] = await Promise.all([
      this.prisma.organizationMember.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              role: true,
              verificationStatus: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                  studentId: true,
                  programme: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      }),
      this.prisma.organizationMember.count({ where }),
    ]);

    return paginate(members, total, page, limit);
  }

  async join(institutionId: string, orgIdOrSlug: string, userId: string) {
    const org = await this.prisma.organization.findFirst({
      where: { institutionId, OR: [{ id: orgIdOrSlug }, { slug: orgIdOrSlug }] },
    });
    if (!org) throw new NotFoundException('Organization not found.');

    const existing = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: org.id, userId } },
    });

    if (existing && existing.status === MembershipStatus.ACTIVE) {
      return { success: true, data: existing, message: 'Already an active member of this organization.' };
    }

    const member = await this.prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: org.id, userId } },
      update: { status: MembershipStatus.ACTIVE, role: GroupMemberRole.MEMBER },
      create: { organizationId: org.id, userId, status: MembershipStatus.ACTIVE, role: GroupMemberRole.MEMBER },
    });

    await this.prisma.organization.update({
      where: { id: org.id },
      data: { memberCount: { increment: 1 } },
    });

    return { success: true, data: member, message: 'Joined organization successfully.' };
  }

  async leave(institutionId: string, orgIdOrSlug: string, userId: string) {
    const org = await this.prisma.organization.findFirst({
      where: { institutionId, OR: [{ id: orgIdOrSlug }, { slug: orgIdOrSlug }] },
    });
    if (!org) throw new NotFoundException('Organization not found.');

    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: org.id, userId } },
    });

    if (!member || member.status !== MembershipStatus.ACTIVE) {
      throw new NotFoundException('You are not an active member of this organization.');
    }

    if (member.role === GroupMemberRole.OWNER) {
      throw new ForbiddenException('Organization owner cannot leave without transferring ownership.');
    }

    await this.prisma.$transaction([
      this.prisma.organizationMember.delete({ where: { id: member.id } }),
      this.prisma.organization.update({
        where: { id: org.id },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);

    return { success: true, message: 'You have left the organization.' };
  }

  async verifyOrganization(institutionId: string, orgId: string, isOfficial: boolean) {
    const org = await this.prisma.organization.findFirst({
      where: { id: orgId, institutionId },
    });
    if (!org) throw new NotFoundException('Organization not found.');

    return this.prisma.organization.update({
      where: { id: orgId },
      data: {
        isOfficial,
        status: isOfficial ? OrganizationStatus.VERIFIED : OrganizationStatus.PENDING_VERIFICATION,
      },
    });
  }

  async update(institutionId: string, orgId: string, userId: string, dto: UpdateOrganizationDto) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });

    if (!member || (member.role !== GroupMemberRole.OWNER && member.role !== GroupMemberRole.MODERATOR)) {
      throw new ForbiddenException('Only club executives can edit organization profile.');
    }

    return this.prisma.organization.update({
      where: { id: orgId },
      data: dto,
    });
  }

  async getEvents(
    institutionId: string,
    orgId: string,
    query: { page?: number; limit?: number },
    userId?: string,
  ) {
    const org = await this.prisma.organization.findFirst({
      where: { institutionId, OR: [{ id: orgId }, { slug: orgId }] },
    });
    if (!org) throw new NotFoundException('Organization not found.');

    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where: { organizationId: org.id, institutionId, status: 'PUBLISHED' },
        skip,
        take,
        orderBy: { startDate: 'asc' },
        include: {
          attendees: userId ? { where: { userId }, select: { status: true } } : false,
        },
      }),
      this.prisma.event.count({
        where: { organizationId: org.id, institutionId, status: 'PUBLISHED' },
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
    orgId: string,
    query: { page?: number; limit?: number },
  ) {
    const org = await this.prisma.organization.findFirst({
      where: { institutionId, OR: [{ id: orgId }, { slug: orgId }] },
    });
    if (!org) throw new NotFoundException('Organization not found.');

    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const [announcements, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where: { organizationId: org.id, institutionId },
        skip,
        take,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.announcement.count({
        where: { organizationId: org.id, institutionId },
      }),
    ]);

    return paginate(announcements, total, page, limit);
  }
}

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Register a university student club or organization' })
  async createOrg(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrganizationDto) {
    return this.orgService.create(user.institutionId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Discover university clubs and verified organizations' })
  async listOrgs(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('verifiedOnly') verifiedOnly?: boolean,
  ) {
    return this.orgService.findAll(
      user.institutionId,
      {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        category,
        search,
        verifiedOnly: verifiedOnly === true || String(verifiedOnly) === 'true',
      },
      user.sub,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get club profile, events and leadership' })
  async getOrg(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.orgService.findOne(user.institutionId, id, user.sub);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'List organization upcoming events' })
  async getOrgEvents(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.orgService.getEvents(user.institutionId, id, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    }, user.sub);
  }

  @Get(':id/announcements')
  @ApiOperation({ summary: 'List official club announcements & notices' })
  async getOrgAnnouncements(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.orgService.getAnnouncements(user.institutionId, id, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get roster of active club members and executives' })
  async getMembers(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.orgService.findMembers(user.institutionId, id, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 30,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update club details (Executive only)' })
  async updateOrg(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.orgService.update(user.institutionId, id, user.sub, dto);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join university club' })
  async joinOrg(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.orgService.join(user.institutionId, id, user.sub);
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Leave university club' })
  async leaveOrg(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.orgService.leave(user.institutionId, id, user.sub);
  }

  @Roles(UserRole.UNIVERSITY_ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/verify')
  @ApiOperation({ summary: 'Grant or revoke official university verified status' })
  async verifyOrg(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('isOfficial') isOfficial: boolean,
  ) {
    return this.orgService.verifyOrganization(user.institutionId, id, isOfficial);
  }
}

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
