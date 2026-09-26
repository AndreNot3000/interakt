import {
  Controller,
  Get,
  Post,
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
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ResourceType, UserRole } from '@prisma/client';
import { paginate, getPaginationSkipTake } from '../../common/helpers/pagination.helper';

export class CreateResourceDto {
  @ApiProperty({ example: 'CSC 301 Past Exam Questions (2020-2025)' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ResourceType, default: ResourceType.PDF })
  @IsEnum(ResourceType)
  type!: ResourceType;

  @ApiProperty({ description: 'Storage S3 key returned by storage upload-url endpoint' })
  @IsString()
  @IsNotEmpty()
  fileKey!: string;

  @ApiPropertyOptional({ example: 'CSC301_Past_Questions.pdf' })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ example: 4500000 })
  @IsOptional()
  @IsInt()
  fileSize?: number;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ example: 'PAST_QUESTION' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  semester?: number;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional()
  @IsInt()
  academicYear?: number;

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
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(institutionId: string, uploaderId: string, dto: CreateResourceDto) {
    if (dto.courseId) {
      const course = await this.prisma.course.findFirst({
        where: { id: dto.courseId, institutionId },
      });
      if (!course) throw new NotFoundException('Course not found.');
    }

    return this.prisma.resource.create({
      data: {
        institutionId,
        uploaderId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        category: dto.category || 'SUMMARY_NOTE',
        semester: dto.semester ? Number(dto.semester) : null,
        academicYear: dto.academicYear ? Number(dto.academicYear) : null,
        fileKey: dto.fileKey,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        courseId: dto.courseId,
        groupId: dto.groupId,
        organizationId: dto.organizationId,
      },
      include: {
        uploader: {
          select: {
            id: true,
            verificationStatus: true,
            profile: {
              select: { firstName: true, lastName: true, avatarUrl: true, level: true, reputationPoints: true },
            },
          },
        },
        course: { select: { id: true, code: true, name: true, semester: true } },
      },
    });
  }

  async findAll(
    institutionId: string,
    query: {
      page?: number;
      limit?: number;
      courseId?: string;
      courseCode?: string;
      groupId?: string;
      organizationId?: string;
      category?: string;
      semester?: number;
      academicYear?: number;
      type?: ResourceType;
      search?: string;
      sortBy?: 'downloads' | 'latest' | 'title';
    },
  ) {
    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const where: any = { institutionId };
    if (query.courseId) where.courseId = query.courseId;
    if (query.courseCode) where.course = { code: { equals: query.courseCode, mode: 'insensitive' } };
    if (query.groupId) where.groupId = query.groupId;
    if (query.organizationId) where.organizationId = query.organizationId;
    if (query.category && query.category !== 'ALL') where.category = query.category;
    if (query.semester) where.semester = Number(query.semester);
    if (query.academicYear) where.academicYear = Number(query.academicYear);
    if (query.type) where.type = query.type;

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { fileName: { contains: term, mode: 'insensitive' } },
        { course: { code: { contains: term, mode: 'insensitive' } } },
        { course: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    let orderBy: any = [{ createdAt: 'desc' }];
    if (query.sortBy === 'downloads') {
      orderBy = [{ downloadCount: 'desc' }, { createdAt: 'desc' }];
    } else if (query.sortBy === 'title') {
      orderBy = [{ title: 'asc' }];
    }

    const [resources, total] = await Promise.all([
      this.prisma.resource.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          uploader: {
            select: {
              id: true,
              verificationStatus: true,
              profile: {
                select: { firstName: true, lastName: true, avatarUrl: true, level: true, reputationPoints: true },
              },
            },
          },
          course: { select: { id: true, code: true, name: true, semester: true } },
        },
      }),
      this.prisma.resource.count({ where }),
    ]);

    return paginate(resources, total, page, limit);
  }

  async getDownloadUrl(institutionId: string, id: string) {
    const resource = await this.prisma.resource.findFirst({
      where: { id, institutionId },
    });
    if (!resource) throw new NotFoundException('Resource not found.');

    // Increment download counter
    const updated = await this.prisma.resource.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
      select: { downloadCount: true },
    });

    const downloadUrl = await this.storage.getPresignedReadUrl(resource.fileKey, 3600);
    return {
      downloadUrl,
      fileName: resource.fileName,
      mimeType: resource.mimeType,
      downloadCount: updated.downloadCount,
      expiresIn: 3600,
    };
  }

  async getPreviewUrl(institutionId: string, id: string) {
    const resource = await this.prisma.resource.findFirst({
      where: { id, institutionId },
      include: {
        course: { select: { id: true, code: true, name: true } },
      },
    });
    if (!resource) throw new NotFoundException('Resource not found.');

    const previewUrl = await this.storage.getPresignedReadUrl(resource.fileKey, 3600, true);
    return {
      previewUrl,
      fileName: resource.fileName,
      mimeType: resource.mimeType,
      title: resource.title,
      course: resource.course,
      expiresIn: 3600,
    };
  }

  async delete(institutionId: string, id: string, userId: string, role: UserRole) {
    const resource = await this.prisma.resource.findFirst({
      where: { id, institutionId },
    });
    if (!resource) throw new NotFoundException('Resource not found.');

    const isUploader = resource.uploaderId === userId;
    const isAdmin = role === UserRole.UNIVERSITY_ADMIN || role === UserRole.SUPER_ADMIN;

    if (!isUploader && !isAdmin) {
      throw new ForbiddenException('You cannot delete this resource.');
    }

    // Delete from S3 storage
    await this.storage.deleteFile(resource.fileKey);

    await this.prisma.resource.delete({ where: { id } });
    return { success: true, message: 'Resource deleted.' };
  }
}

@ApiTags('resources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post()
  @ApiOperation({ summary: 'Upload/link academic study material or document' })
  async createResource(@CurrentUser() user: JwtPayload, @Body() dto: CreateResourceDto) {
    return this.resourcesService.create(user.institutionId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Search and filter campus study materials' })
  async listResources(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('courseId') courseId?: string,
    @Query('courseCode') courseCode?: string,
    @Query('groupId') groupId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('category') category?: string,
    @Query('semester') semester?: number,
    @Query('academicYear') academicYear?: number,
    @Query('type') type?: ResourceType,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'downloads' | 'latest' | 'title',
  ) {
    return this.resourcesService.findAll(user.institutionId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      courseId,
      courseCode,
      groupId,
      organizationId,
      category,
      semester: semester ? Number(semester) : undefined,
      academicYear: academicYear ? Number(academicYear) : undefined,
      type,
      search,
      sortBy,
    });
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get secure signed URL for resource download' })
  async getDownload(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.resourcesService.getDownloadUrl(user.institutionId, id);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Get secure inline signed URL for in-browser PDF preview' })
  async getPreview(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.resourcesService.getPreviewUrl(user.institutionId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete resource (uploader or university admin)' })
  async deleteResource(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.resourcesService.delete(user.institutionId, id, user.sub, user.role);
  }
}

@Module({
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
