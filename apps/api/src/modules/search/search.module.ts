import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Injectable } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PostStatus, EventStatus } from '@prisma/client';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(institutionId: string, q: string) {
    if (!q || q.trim().length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters.');
    }

    const term = q.trim();

    const [
      courses,
      groups,
      organizations,
      events,
      students,
      questions,
      resources,
      opportunities,
    ] = await Promise.all([
      // Courses
      this.prisma.course.findMany({
        where: {
          institutionId,
          OR: [
            { code: { contains: term, mode: 'insensitive' } },
            { name: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: {
          id: true,
          code: true,
          name: true,
          level: true,
          units: true,
        },
      }),

      // Groups
      this.prisma.group.findMany({
        where: {
          institutionId,
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          avatarUrl: true,
          memberCount: true,
        },
      }),

      // Organizations
      this.prisma.organization.findMany({
        where: {
          institutionId,
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          isOfficial: true,
          avatarUrl: true,
          memberCount: true,
        },
      }),

      // Events
      this.prisma.event.findMany({
        where: {
          institutionId,
          status: EventStatus.PUBLISHED,
          title: { contains: term, mode: 'insensitive' },
        },
        take: 5,
        select: {
          id: true,
          title: true,
          startDate: true,
          location: true,
          category: true,
          coverImageUrl: true,
        },
      }),

      // Students
      this.prisma.user.findMany({
        where: {
          institutionId,
          isActive: true,
          isDeactivated: false,
          OR: [
            { profile: { firstName: { contains: term, mode: 'insensitive' } } },
            { profile: { lastName: { contains: term, mode: 'insensitive' } } },
            { profile: { displayName: { contains: term, mode: 'insensitive' } } },
          ],
        },
        take: 5,
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
      }),

      // Academic Questions
      this.prisma.question.findMany({
        where: {
          institutionId,
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { content: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: {
          id: true,
          title: true,
          tags: true,
          answerCount: true,
          viewCount: true,
        },
      }),

      // Resources
      this.prisma.resource.findMany({
        where: {
          institutionId,
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: {
          id: true,
          title: true,
          type: true,
          fileName: true,
          downloadCount: true,
        },
      }),

      // Opportunities
      this.prisma.opportunity.findMany({
        where: {
          institutionId,
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { organizationName: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: {
          id: true,
          title: true,
          category: true,
          organizationName: true,
          deadline: true,
        },
      }),
    ]);

    return {
      query: term,
      results: {
        courses,
        groups,
        organizations,
        events,
        students,
        questions,
        resources,
        opportunities,
      },
    };
  }
}

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Campus-wide search across students, courses, clubs, events, and resources' })
  async search(@CurrentUser() user: JwtPayload, @Query('q') q: string) {
    return this.searchService.globalSearch(user.institutionId, q);
  }
}

@Module({
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
