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
import { InstitutionsService } from './institutions.service';
import { CreateInstitutionDto, UpdateInstitutionDto } from './dto/institution.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, InstitutionStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('institutions')
@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all active universities for student onboarding' })
  async listInstitutions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: InstitutionStatus,
  ) {
    return this.institutionsService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      search,
      status: status || InstitutionStatus.ACTIVE,
    });
  }

  @Public()
  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get university profile and academic hierarchy' })
  async getInstitution(@Param('idOrSlug') idOrSlug: string) {
    return this.institutionsService.findOne(idOrSlug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create and onboard a new university institution (Super Admin only)' })
  async createInstitution(@Body() dto: CreateInstitutionDto) {
    return this.institutionsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.UNIVERSITY_ADMIN)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update institution configuration (University Admin or Super Admin)' })
  async updateInstitution(
    @Param('id') id: string,
    @Body() dto: UpdateInstitutionDto,
  ) {
    return this.institutionsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get overview statistics for institution' })
  async getInstitutionStats(@Param('id') id: string) {
    return this.institutionsService.getStats(id);
  }
}
