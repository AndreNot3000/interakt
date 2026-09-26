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
  Injectable,
  NotFoundException,
  Module,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { AnnouncementVisibility, UserRole } from '@prisma/client';
import { paginate, getPaginationSkipTake } from '../../common/helpers/pagination.helper';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Important Notice: Hackathon Registration Open' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'All registered students are invited to submit their team details...' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ enum: AnnouncementVisibility, default: AnnouncementVisibility.INSTITUTION })
  @IsOptional()
  @IsEnum(AnnouncementVisibility)
  visibility?: AnnouncementVisibility;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facultyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

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

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(institutionId: string, authorId: string, userRole: UserRole, dto: CreateAnnouncementDto) {
    // Validate authorization based on context
    if (dto.organizationId) {
      const orgMember = await this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: dto.organizationId, userId: authorId } },
      });
      const isOrgLead = orgMember && ['OWNER', 'ADMIN', 'MODERATOR'].includes(orgMember.role);
      const isUnivAdmin = userRole === UserRole.UNIVERSITY_ADMIN || userRole === UserRole.SUPER_ADMIN;
      if (!isOrgLead && !isUnivAdmin) {
        throw new ForbiddenException('Only club executives or university administrators can broadcast announcements for this society.');
      }
    } else if (dto.groupId) {
      const groupMember = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: dto.groupId, userId: authorId } },
      });
      const isGroupLead = groupMember && ['OWNER', 'MODERATOR'].includes(groupMember.role);
      const isUnivAdmin = userRole === UserRole.UNIVERSITY_ADMIN || userRole === UserRole.SUPER_ADMIN;
      if (!isGroupLead && !isUnivAdmin) {
        throw new ForbiddenException('Only group owners or moderators can broadcast announcements for this circle.');
      }
    } else {
      const isUnivAdmin = userRole === UserRole.UNIVERSITY_ADMIN || userRole === UserRole.SUPER_ADMIN;
      if (!isUnivAdmin) {
        throw new ForbiddenException('Only university administrators can broadcast campus-wide announcements.');
      }
    }

    return this.prisma.announcement.create({
      data: {
        institutionId,
        authorId,
        title: dto.title,
        content: dto.content,
        visibility: dto.visibility || AnnouncementVisibility.INSTITUTION,
        isPinned: dto.isPinned || false,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        facultyId: dto.facultyId,
        departmentId: dto.departmentId,
        courseId: dto.courseId,
        groupId: dto.groupId,
        organizationId: dto.organizationId,
      },
    });
  }

  async findAll(
    institutionId: string,
    query: {
      page?: number;
      limit?: number;
      visibility?: AnnouncementVisibility;
      facultyId?: string;
      departmentId?: string;
      courseId?: string;
      groupId?: string;
      organizationId?: string;
    },
  ) {
    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const where: any = {
      institutionId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };

    if (query.visibility) where.visibility = query.visibility;
    if (query.facultyId) where.facultyId = query.facultyId;
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.courseId) where.courseId = query.courseId;
    if (query.groupId) where.groupId = query.groupId;
    if (query.organizationId) where.organizationId = query.organizationId;

    const [announcements, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        skip,
        take,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          faculty: { select: { id: true, name: true, shortName: true } },
          department: { select: { id: true, name: true, shortName: true } },
          course: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.announcement.count({ where }),
    ]);

    return paginate(announcements, total, page, limit);
  }

  async findOne(institutionId: string, id: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, institutionId },
      include: {
        faculty: true,
        department: true,
        course: true,
      },
    });

    if (!announcement) throw new NotFoundException('Announcement not found.');
    return announcement;
  }

  async delete(institutionId: string, id: string, userId: string, userRole: UserRole) {
    const announcement = await this.findOne(institutionId, id);

    const isAuthor = announcement.authorId === userId;
    const isUnivAdmin = userRole === UserRole.UNIVERSITY_ADMIN || userRole === UserRole.SUPER_ADMIN;

    if (!isAuthor && !isUnivAdmin) {
      throw new ForbiddenException('You do not have permission to delete this announcement.');
    }

    await this.prisma.announcement.delete({ where: { id } });
    return { success: true, message: 'Announcement deleted.' };
  }
}

@ApiTags('announcements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @ApiOperation({ summary: 'Browse official campus announcements by university, faculty, department, club, or group' })
  async listAnnouncements(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('visibility') visibility?: AnnouncementVisibility,
    @Query('facultyId') facultyId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('courseId') courseId?: string,
    @Query('groupId') groupId?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.announcementsService.findAll(user.institutionId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      visibility,
      facultyId,
      departmentId,
      courseId,
      groupId,
      organizationId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get official announcement details' })
  async getAnnouncement(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.announcementsService.findOne(user.institutionId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Broadcast announcement (Admin, Club Executive, or Group Leader)' })
  async createAnnouncement(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.announcementsService.create(user.institutionId, user.sub, user.role, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete announcement (Author or Admin)' })
  async deleteAnnouncement(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.announcementsService.delete(user.institutionId, id, user.sub, user.role);
  }
}

@Module({
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
