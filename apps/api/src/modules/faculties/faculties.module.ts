import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
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
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

export class CreateFacultyDto {
  @ApiProperty({ example: 'Faculty of Science' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'SCI' })
  @IsOptional()
  @IsString()
  shortName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateFacultyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

@Injectable()
export class FacultiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(institutionId: string) {
    return this.prisma.faculty.findMany({
      where: { institutionId },
      include: {
        departments: {
          include: {
            programmes: true,
          },
        },
        _count: {
          select: {
            departments: true,
            profiles: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(institutionId: string, id: string) {
    const faculty = await this.prisma.faculty.findFirst({
      where: { id, institutionId },
      include: {
        departments: {
          include: {
            programmes: {
              include: {
                courses: true,
              },
            },
          },
        },
        _count: { select: { profiles: true } },
      },
    });

    if (!faculty) throw new NotFoundException('Faculty not found.');
    return faculty;
  }

  async create(institutionId: string, dto: CreateFacultyDto) {
    return this.prisma.faculty.create({
      data: {
        institutionId,
        name: dto.name,
        shortName: dto.shortName,
        description: dto.description,
      },
    });
  }

  async update(institutionId: string, id: string, dto: UpdateFacultyDto) {
    await this.findOne(institutionId, id);
    return this.prisma.faculty.update({
      where: { id },
      data: dto,
    });
  }

  async delete(institutionId: string, id: string) {
    await this.findOne(institutionId, id);
    await this.prisma.faculty.delete({ where: { id } });
    return { success: true, message: 'Faculty deleted.' };
  }
}

@ApiTags('faculties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('faculties')
export class FacultiesController {
  constructor(private readonly facultiesService: FacultiesService) {}

  @Get()
  @ApiOperation({ summary: 'List all faculties for the student university' })
  async listFaculties(@CurrentUser() user: JwtPayload) {
    return this.facultiesService.findAll(user.institutionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get faculty details with departments and programmes' })
  async getFaculty(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.facultiesService.findOne(user.institutionId, id);
  }

  @Roles(UserRole.UNIVERSITY_ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create faculty (Admin only)' })
  async createFaculty(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFacultyDto,
  ) {
    return this.facultiesService.create(user.institutionId, dto);
  }

  @Roles(UserRole.UNIVERSITY_ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update faculty (Admin only)' })
  async updateFaculty(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateFacultyDto,
  ) {
    return this.facultiesService.update(user.institutionId, id, dto);
  }

  @Roles(UserRole.UNIVERSITY_ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete faculty (Admin only)' })
  async deleteFaculty(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.facultiesService.delete(user.institutionId, id);
  }
}

@Module({
  controllers: [FacultiesController],
  providers: [FacultiesService],
  exports: [FacultiesService],
})
export class FacultiesModule {}
