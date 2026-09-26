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
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OpportunityCategory, OpportunityStatus, UserRole } from '@prisma/client';
import { paginate, getPaginationSkipTake } from '../../common/helpers/pagination.helper';

export class CreateOpportunityDto {
  @ApiProperty({ example: 'Google Software Engineering Summer Internship' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Exciting 12-week internship opportunity for CS/Eng students.' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ enum: OpportunityCategory, example: OpportunityCategory.INTERNSHIP })
  @IsEnum(OpportunityCategory)
  category!: OpportunityCategory;

  @ApiPropertyOptional({ example: 'Google Nigeria' })
  @IsOptional()
  @IsString()
  organizationName?: string;

  @ApiPropertyOptional({ example: 'Lagos, Nigeria' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @ApiPropertyOptional({ example: 'https://careers.google.com/jobs/results/12345' })
  @IsOptional()
  @IsUrl()
  applicationUrl?: string;

  @ApiPropertyOptional({ example: '2026-11-30T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ example: 'Paid (Competitive)' })
  @IsOptional()
  @IsString()
  stipend?: string;

  @ApiPropertyOptional({ example: 'Enrolled in Computer Science or related degree' })
  @IsOptional()
  @IsString()
  requirements?: string;
}

@Injectable()
export class OpportunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(institutionId: string, publisherId: string, dto: CreateOpportunityDto) {
    return this.prisma.opportunity.create({
      data: {
        institutionId,
        publisherId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        organizationName: dto.organizationName,
        location: dto.location,
        isRemote: dto.isRemote || false,
        applicationUrl: dto.applicationUrl,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        stipend: dto.stipend,
        requirements: dto.requirements,
      },
    });
  }

  async findAll(
    institutionId: string,
    userId: string,
    query: {
      page?: number;
      limit?: number;
      category?: OpportunityCategory;
      isRemote?: boolean;
      search?: string;
    },
  ) {
    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const where: any = {
      institutionId,
      status: OpportunityStatus.ACTIVE,
    };

    if (query.category) where.category = query.category;
    if (query.isRemote !== undefined) where.isRemote = query.isRemote;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { organizationName: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [opportunities, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where,
        skip,
        take,
        orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
        include: {
          bookmarks: {
            where: { userId },
            select: { id: true },
          },
        },
      }),
      this.prisma.opportunity.count({ where }),
    ]);

    const formatted = opportunities.map((opp) => ({
      ...opp,
      isBookmarked: opp.bookmarks.length > 0,
      bookmarks: undefined,
    }));

    return paginate(formatted, total, page, limit);
  }

  async findOne(institutionId: string, id: string, userId: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id, institutionId },
      include: {
        bookmarks: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    if (!opp) throw new NotFoundException('Opportunity not found.');

    return {
      ...opp,
      isBookmarked: opp.bookmarks.length > 0,
      bookmarks: undefined,
    };
  }

  async bookmark(userId: string, opportunityId: string) {
    await this.prisma.opportunityBookmark.upsert({
      where: { userId_opportunityId: { userId, opportunityId } },
      update: {},
      create: { userId, opportunityId },
    });
    return { success: true, message: 'Opportunity saved to bookmarks.' };
  }

  async unbookmark(userId: string, opportunityId: string) {
    await this.prisma.opportunityBookmark.deleteMany({
      where: { userId, opportunityId },
    });
    return { success: true, message: 'Bookmark removed.' };
  }
}

@ApiTags('opportunities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly oppService: OpportunitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List internships, scholarships, hackathons & campus opportunities' })
  async listOpportunities(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: OpportunityCategory,
    @Query('isRemote') isRemote?: boolean,
    @Query('search') search?: string,
  ) {
    return this.oppService.findAll(user.institutionId, user.sub, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      category,
      isRemote: isRemote !== undefined ? isRemote === true || String(isRemote) === 'true' : undefined,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get opportunity details' })
  async getOpportunity(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.oppService.findOne(user.institutionId, id, user.sub);
  }

  @Roles(UserRole.UNIVERSITY_ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Publish a new student opportunity (Admins and verified clubs)' })
  async createOpportunity(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOpportunityDto,
  ) {
    return this.oppService.create(user.institutionId, user.sub, dto);
  }

  @Post(':id/bookmark')
  @ApiOperation({ summary: 'Bookmark an opportunity' })
  async bookmarkOpp(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.oppService.bookmark(user.sub, id);
  }

  @Delete(':id/bookmark')
  @ApiOperation({ summary: 'Remove bookmark from opportunity' })
  async unbookmarkOpp(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.oppService.unbookmark(user.sub, id);
  }
}

@Module({
  controllers: [OpportunitiesController],
  providers: [OpportunitiesService],
  exports: [OpportunitiesService],
})
export class OpportunitiesModule {}
