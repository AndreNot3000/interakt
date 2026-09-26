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
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

export class CreateProgrammeDto {
  @ApiProperty({ example: 'B.Sc. Computer Science' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'BSC-CS' })
  @IsOptional()
  @IsString()
  shortName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'dept_cuid_123' })
  @IsString()
  @IsNotEmpty()
  departmentId!: string;

  @ApiPropertyOptional({ default: 4, example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  durationYears?: number;
}

export class UpdateProgrammeDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  durationYears?: number;
}

@Injectable()
export class ProgrammesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(institutionId: string, departmentId?: string) {
    const where: any = { institutionId };
    if (departmentId) where.departmentId = departmentId;

    return this.prisma.programme.findMany({
      where,
      include: {
        department: {
          include: {
            faculty: { select: { id: true, name: true } },
          },
        },
        courses: true,
        _count: { select: { profiles: true, courses: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(institutionId: string, id: string) {
    const programme = await this.prisma.programme.findFirst({
      where: { id, institutionId },
      include: {
        department: {
          include: {
            faculty: true,
          },
        },
        courses: {
          orderBy: [{ level: 'asc' }, { code: 'asc' }],
        },
        _count: { select: { profiles: true } },
      },
    });

    if (!programme) throw new NotFoundException('Programme not found.');
    return programme;
  }

  async create(institutionId: string, dto: CreateProgrammeDto) {
    const dept = await this.prisma.department.findFirst({
      where: { id: dto.departmentId, institutionId },
    });
    if (!dept) throw new NotFoundException('Department not found in your institution.');

    return this.prisma.programme.create({
      data: {
        institutionId,
        departmentId: dto.departmentId,
        name: dto.name,
        shortName: dto.shortName,
        description: dto.description,
        durationYears: dto.durationYears || 4,
      },
    });
  }

  async update(institutionId: string, id: string, dto: UpdateProgrammeDto) {
    await this.findOne(institutionId, id);
    return this.prisma.programme.update({
      where: { id },
      data: dto,
    });
  }

  async delete(institutionId: string, id: string) {
    await this.findOne(institutionId, id);
    await this.prisma.programme.delete({ where: { id } });
    return { success: true, message: 'Programme deleted.' };
  }
}

@ApiTags('programmes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('programmes')
export class ProgrammesController {
  constructor(private readonly programmesService: ProgrammesService) {}

  @Get()
  @ApiOperation({ summary: 'List programmes with optional department filter' })
  async listProgrammes(
    @CurrentUser() user: JwtPayload,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.programmesService.findAll(user.institutionId, departmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get programme details and enrolled courses by level' })
  async getProgramme(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.programmesService.findOne(user.institutionId, id);
  }

  @Roles(UserRole.UNIVERSITY_ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create degree programme (Admin only)' })
  async createProgramme(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProgrammeDto,
  ) {
    return this.programmesService.create(user.institutionId, dto);
  }

  @Roles(UserRole.UNIVERSITY_ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update programme (Admin only)' })
  async updateProgramme(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProgrammeDto,
  ) {
    return this.programmesService.update(user.institutionId, id, dto);
  }

  @Roles(UserRole.UNIVERSITY_ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete programme (Admin only)' })
  async deleteProgramme(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.programmesService.delete(user.institutionId, id);
  }
}

@Module({
  controllers: [ProgrammesController],
  providers: [ProgrammesService],
  exports: [ProgrammesService],
})
export class ProgrammesModule {}
