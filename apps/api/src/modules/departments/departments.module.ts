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

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Department of Computer Science' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'CSC' })
  @IsOptional()
  @IsString()
  shortName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'faculty_cuid_123' })
  @IsString()
  @IsNotEmpty()
  facultyId!: string;
}

export class UpdateDepartmentDto {
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
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(institutionId: string, facultyId?: string) {
    const where: any = { institutionId };
    if (facultyId) where.facultyId = facultyId;

    return this.prisma.department.findMany({
      where,
      include: {
        faculty: { select: { id: true, name: true } },
        programmes: true,
        _count: { select: { profiles: true, programmes: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(institutionId: string, id: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, institutionId },
      include: {
        faculty: true,
        programmes: {
          include: {
            courses: true,
          },
        },
        _count: { select: { profiles: true } },
      },
    });

    if (!dept) throw new NotFoundException('Department not found.');
    return dept;
  }

  async create(institutionId: string, dto: CreateDepartmentDto) {
    // Validate faculty belongs to same institution
    const faculty = await this.prisma.faculty.findFirst({
      where: { id: dto.facultyId, institutionId },
    });
    if (!faculty) throw new NotFoundException('Faculty not found in your institution.');

    return this.prisma.department.create({
      data: {
        institutionId,
        facultyId: dto.facultyId,
        name: dto.name,
        shortName: dto.shortName,
        description: dto.description,
      },
    });
  }

  async update(institutionId: string, id: string, dto: UpdateDepartmentDto) {
    await this.findOne(institutionId, id);
    return this.prisma.department.update({
      where: { id },
      data: dto,
    });
  }

  async delete(institutionId: string, id: string) {
    await this.findOne(institutionId, id);
    await this.prisma.department.delete({ where: { id } });
    return { success: true, message: 'Department deleted.' };
  }
}

@ApiTags('departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List departments with optional faculty filter' })
  async listDepartments(
    @CurrentUser() user: JwtPayload,
    @Query('facultyId') facultyId?: string,
  ) {
    return this.departmentsService.findAll(user.institutionId, facultyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department details and programmes' })
  async getDepartment(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.departmentsService.findOne(user.institutionId, id);
  }

  @Roles(UserRole.UNIVERSITY_ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create department (Admin only)' })
  async createDepartment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.departmentsService.create(user.institutionId, dto);
  }

  @Roles(UserRole.UNIVERSITY_ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update department (Admin only)' })
  async updateDepartment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(user.institutionId, id, dto);
  }

  @Roles(UserRole.UNIVERSITY_ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete department (Admin only)' })
  async deleteDepartment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.departmentsService.delete(user.institutionId, id);
  }
}

@Module({
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
