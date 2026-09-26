import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Module } from '@nestjs/common';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ReportReason,
  ReportStatus,
  ReportTargetType,
  UserRole,
  PostStatus,
} from '@prisma/client';
import { paginate, getPaginationSkipTake } from '../../common/helpers/pagination.helper';

export class CreateReportDto {
  @ApiProperty({ enum: ReportTargetType, example: ReportTargetType.POST })
  @IsEnum(ReportTargetType)
  targetType!: ReportTargetType;

  @ApiProperty({ example: 'post_id_or_user_id' })
  @IsString()
  @IsNotEmpty()
  targetId!: string;

  @ApiProperty({ enum: ReportReason, example: ReportReason.HARASSMENT })
  @IsEnum(ReportReason)
  reason!: ReportReason;

  @ApiPropertyOptional({ example: 'This user is repeatedly posting abusive remarks in CSC 301.' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class ResolveReportDto {
  @ApiProperty({ enum: ReportStatus, example: ReportStatus.RESOLVED })
  @IsEnum(ReportStatus)
  status!: ReportStatus;

  @ApiPropertyOptional({ example: 'Violating post was removed and user warned.' })
  @IsOptional()
  @IsString()
  reviewNote?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether to remove the reported content' })
  @IsOptional()
  actionTaken?: boolean;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(reportedById: string, dto: CreateReportDto) {
    let postId: string | undefined;
    let commentId: string | undefined;
    let reportedUserId: string | undefined;
    let eventId: string | undefined;

    if (dto.targetType === ReportTargetType.POST) postId = dto.targetId;
    if (dto.targetType === ReportTargetType.COMMENT) commentId = dto.targetId;
    if (dto.targetType === ReportTargetType.USER) reportedUserId = dto.targetId;
    if (dto.targetType === ReportTargetType.EVENT) eventId = dto.targetId;

    return this.prisma.report.create({
      data: {
        reportedById,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        description: dto.description,
        status: ReportStatus.PENDING,
        postId,
        commentId,
        reportedUserId,
        eventId,
      },
    });
  }

  async findAll(query: { page?: number; limit?: number; status?: ReportStatus }) {
    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const where: any = {};
    if (query.status) where.status = query.status;

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          reportedBy: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return paginate(reports, total, page, limit);
  }

  async resolve(id: string, reviewerId: string, dto: ResolveReportDto) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found.');

    // If actionTaken, remove or hide the target entity
    if (dto.actionTaken) {
      if (report.targetType === ReportTargetType.POST && report.postId) {
        await this.prisma.post.update({
          where: { id: report.postId },
          data: { status: PostStatus.REMOVED_BY_MODERATOR },
        });
      } else if (report.targetType === ReportTargetType.COMMENT && report.commentId) {
        await this.prisma.comment.update({
          where: { id: report.commentId },
          data: { isRemoved: true, content: '[Removed by moderator]' },
        });
      }
    }

    return this.prisma.report.update({
      where: { id },
      data: {
        status: dto.status,
        reviewedBy: reviewerId,
        reviewNote: dto.reviewNote,
        reviewedAt: new Date(),
      },
    });
  }
}

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Report inappropriate content, user, or conduct' })
  async createReport(@CurrentUser() user: JwtPayload, @Body() dto: CreateReportDto) {
    return this.reportsService.create(user.sub, dto);
  }

  @Roles(UserRole.UNIVERSITY_ADMIN, UserRole.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: 'Moderation queue of user reports (Admin only)' })
  async listReports(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ReportStatus,
  ) {
    return this.reportsService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      status,
    });
  }

  @Roles(UserRole.UNIVERSITY_ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Resolve report and execute moderation action (Admin only)' })
  async resolveReport(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.reportsService.resolve(id, user.sub, dto);
  }
}

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
