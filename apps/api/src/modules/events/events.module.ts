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
  ConflictException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Module } from '@nestjs/common';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import {
  EventCategory,
  EventStatus,
  EventVisibility,
  AttendanceStatus,
  CalendarItemType,
  UserRole,
} from '@prisma/client';
import { paginate, getPaginationSkipTake } from '../../common/helpers/pagination.helper';

export class CreateEventDto {
  @ApiProperty({ example: 'Tech Campus Hackathon 2026' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: 'Main Auditorium, Faculty of Science' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationUrl?: string;

  @ApiProperty({ example: '2026-10-15T09:00:00.000Z' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-10-15T18:00:00.000Z' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ enum: EventCategory, default: EventCategory.TECHNOLOGY })
  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory;

  @ApiPropertyOptional({ enum: EventVisibility, default: EventVisibility.INSTITUTION })
  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresRegistration?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  onlineMeetingUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseId?: string;
}

export class UpdateEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: EventCategory })
  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory;

  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  capacity?: number;
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(institutionId: string, userId: string, dto: CreateEventDto) {
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('End date must be after start date.');
    }

    const event = await this.prisma.event.create({
      data: {
        institutionId,
        title: dto.title,
        description: dto.description,
        coverImageUrl: dto.coverImageUrl,
        location: dto.location,
        locationUrl: dto.locationUrl,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        organizerId: dto.organizationId || userId,
        organizerType: dto.organizationId ? 'organization' : 'user',
        category: dto.category || EventCategory.OTHER,
        status: EventStatus.PUBLISHED,
        visibility: dto.visibility || EventVisibility.INSTITUTION,
        capacity: dto.capacity,
        requiresRegistration: dto.requiresRegistration || false,
        isOnline: dto.isOnline || false,
        onlineMeetingUrl: dto.onlineMeetingUrl,
        groupId: dto.groupId,
        organizationId: dto.organizationId,
        courseId: dto.courseId,
        attendeeCount: 1, // creator is registered
      },
    });

    // Auto-register organizer as attendee
    await this.prisma.eventAttendee.upsert({
      where: { eventId_userId: { eventId: event.id, userId } },
      update: { status: AttendanceStatus.REGISTERED },
      create: {
        eventId: event.id,
        userId,
        status: AttendanceStatus.REGISTERED,
      },
    });

    // Auto-create calendar item for organizer
    await this.prisma.calendarItem.upsert({
      where: { id: `event_${event.id}_${userId}` },
      update: {
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        title: event.title,
        description: event.description,
      },
      create: {
        id: `event_${event.id}_${userId}`,
        userId,
        title: event.title,
        description: event.description,
        type: CalendarItemType.EVENT,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        color: '#8b5cf6',
        eventId: event.id,
      },
    });

    return event;
  }

  async findAll(
    institutionId: string,
    userId: string,
    query: {
      page?: number;
      limit?: number;
      category?: EventCategory;
      timeframe?: 'all' | 'upcoming' | 'today' | 'this_week' | 'past';
      upcomingOnly?: boolean;
      organizationId?: string;
      groupId?: string;
      courseId?: string;
      search?: string;
      rsvpStatus?: 'all' | 'going' | 'interested' | 'my_rsvps';
    },
  ) {
    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const where: any = {
      institutionId,
      status: EventStatus.PUBLISHED,
    };

    if (query.category) where.category = query.category;
    if (query.organizationId) where.organizationId = query.organizationId;
    if (query.groupId) where.groupId = query.groupId;
    if (query.courseId) where.courseId = query.courseId;

    const now = new Date();

    if (query.timeframe === 'past') {
      where.endDate = { lt: now };
    } else if (query.timeframe === 'today') {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      where.startDate = { lte: endOfDay };
      where.endDate = { gte: startOfDay };
    } else if (query.timeframe === 'this_week') {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      where.startDate = { lte: endOfWeek };
      where.endDate = { gte: startOfWeek };
    } else if (query.upcomingOnly || query.timeframe === 'upcoming') {
      where.endDate = { gte: now };
    }

    if (query.rsvpStatus === 'going') {
      where.attendees = { some: { userId, status: AttendanceStatus.REGISTERED } };
    } else if (query.rsvpStatus === 'interested') {
      where.attendees = { some: { userId, status: AttendanceStatus.INTERESTED } };
    } else if (query.rsvpStatus === 'my_rsvps') {
      where.attendees = {
        some: {
          userId,
          status: { in: [AttendanceStatus.REGISTERED, AttendanceStatus.INTERESTED] },
        },
      };
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { location: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take,
        orderBy: { startDate: 'asc' },
        include: {
          organization: { select: { id: true, name: true, avatarUrl: true, isOfficial: true } },
          group: { select: { id: true, name: true, avatarUrl: true } },
          attendees: {
            where: { userId },
            select: { status: true },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    // Batch resolve student organizers for events without organization/group
    const userOrganizerIds = Array.from(
      new Set(
        events
          .filter((e) => !e.organization && !e.group && e.organizerId)
          .map((e) => e.organizerId),
      ),
    );

    const userOrganizers = userOrganizerIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: userOrganizerIds } },
          select: {
            id: true,
            role: true,
            profile: {
              select: {
                displayName: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        })
      : [];
    const userMap = new Map(userOrganizers.map((u) => [u.id, u]));

    const formatted = events.map((event) => {
      let organizer: {
        id: string;
        name: string;
        type: 'organization' | 'group' | 'user';
        avatarUrl?: string | null;
        isOfficial?: boolean;
      };

      if (event.organization) {
        organizer = {
          id: event.organization.id,
          name: event.organization.name,
          type: 'organization',
          avatarUrl: event.organization.avatarUrl,
          isOfficial: event.organization.isOfficial,
        };
      } else if (event.group) {
        organizer = {
          id: event.group.id,
          name: event.group.name,
          type: 'group',
          avatarUrl: event.group.avatarUrl,
        };
      } else {
        const u = userMap.get(event.organizerId);
        const uName =
          u?.profile?.displayName ||
          (u?.profile ? `${u.profile.firstName} ${u.profile.lastName}`.trim() : 'Campus Community');
        organizer = {
          id: event.organizerId,
          name: uName || 'Campus Community',
          type: 'user',
          avatarUrl: u?.profile?.avatarUrl || null,
        };
      }

      return {
        ...event,
        organizer,
        userStatus: event.attendees[0]?.status || null,
        attendees: undefined,
      };
    });

    return paginate(formatted, total, page, limit);
  }

  async findOne(institutionId: string, id: string, userId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, institutionId },
      include: {
        organization: { select: { id: true, name: true, avatarUrl: true, isOfficial: true } },
        group: { select: { id: true, name: true, avatarUrl: true } },
        attendees: {
          where: { userId },
          select: { status: true },
        },
      },
    });

    if (!event) throw new NotFoundException('Event not found.');

    let organizer: {
      id: string;
      name: string;
      type: 'organization' | 'group' | 'user';
      avatarUrl?: string | null;
      isOfficial?: boolean;
    };

    if (event.organization) {
      organizer = {
        id: event.organization.id,
        name: event.organization.name,
        type: 'organization',
        avatarUrl: event.organization.avatarUrl,
        isOfficial: event.organization.isOfficial,
      };
    } else if (event.group) {
      organizer = {
        id: event.group.id,
        name: event.group.name,
        type: 'group',
        avatarUrl: event.group.avatarUrl,
      };
    } else {
      const u = await this.prisma.user.findUnique({
        where: { id: event.organizerId },
        select: {
          id: true,
          profile: {
            select: {
              displayName: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      });
      const uName =
        u?.profile?.displayName ||
        (u?.profile ? `${u.profile.firstName} ${u.profile.lastName}`.trim() : 'Campus Community');
      organizer = {
        id: event.organizerId,
        name: uName || 'Campus Community',
        type: 'user',
        avatarUrl: u?.profile?.avatarUrl || null,
      };
    }

    return {
      ...event,
      organizer,
      userStatus: event.attendees[0]?.status || null,
      attendees: undefined,
    };
  }

  async setAttendance(
    institutionId: string,
    eventId: string,
    userId: string,
    rawStatus: AttendanceStatus | string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, institutionId },
    });
    if (!event) throw new NotFoundException('Event not found.');

    const statusUpper = String(rawStatus || '').toUpperCase();
    let targetStatus: AttendanceStatus = AttendanceStatus.INTERESTED;

    if (statusUpper === 'REGISTERED' || statusUpper === 'GOING' || statusUpper === 'ATTENDING') {
      targetStatus = AttendanceStatus.REGISTERED;
    } else if (statusUpper === 'INTERESTED') {
      targetStatus = AttendanceStatus.INTERESTED;
    } else if (statusUpper === 'CANCEL' || statusUpper === 'CANCELLED' || statusUpper === 'NONE') {
      return this.cancelAttendance(eventId, userId);
    }

    const existing = await this.prisma.eventAttendee.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (
      targetStatus === AttendanceStatus.REGISTERED &&
      event.capacity &&
      existing?.status !== AttendanceStatus.REGISTERED
    ) {
      const registeredCount = await this.prisma.eventAttendee.count({
        where: { eventId, status: AttendanceStatus.REGISTERED },
      });
      if (registeredCount >= event.capacity) {
        throw new BadRequestException('This event has reached full capacity.');
      }
    }

    await this.prisma.eventAttendee.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: { status: targetStatus },
      create: { eventId, userId, status: targetStatus },
    });

    // Synchronize to student's personal calendar
    await this.prisma.calendarItem.upsert({
      where: { id: `event_${eventId}_${userId}` },
      update: {
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        title: event.title,
        description: event.description,
      },
      create: {
        id: `event_${eventId}_${userId}`,
        userId,
        title: event.title,
        description: event.description,
        type: CalendarItemType.EVENT,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        color: '#8b5cf6',
        eventId: event.id,
      },
    });

    // Refresh denormalized counts
    const [attendeeCount, interestedCount] = await Promise.all([
      this.prisma.eventAttendee.count({ where: { eventId, status: AttendanceStatus.REGISTERED } }),
      this.prisma.eventAttendee.count({ where: { eventId, status: AttendanceStatus.INTERESTED } }),
    ]);

    await this.prisma.event.update({
      where: { id: eventId },
      data: { attendeeCount, interestedCount },
    });

    return {
      success: true,
      status: targetStatus,
      attendeeCount,
      interestedCount,
      message:
        targetStatus === AttendanceStatus.REGISTERED
          ? 'Registered for event! Added to your campus calendar.'
          : 'Marked as interested! Added to your campus calendar.',
    };
  }

  async cancelAttendance(eventId: string, userId: string) {
    await this.prisma.eventAttendee.deleteMany({
      where: { eventId, userId },
    });

    // Remove from calendar
    await this.prisma.calendarItem.deleteMany({
      where: { eventId, userId },
    });

    const [attendeeCount, interestedCount] = await Promise.all([
      this.prisma.eventAttendee.count({ where: { eventId, status: AttendanceStatus.REGISTERED } }),
      this.prisma.eventAttendee.count({ where: { eventId, status: AttendanceStatus.INTERESTED } }),
    ]);

    await this.prisma.event.update({
      where: { id: eventId },
      data: { attendeeCount, interestedCount },
    });

    return {
      success: true,
      status: null,
      attendeeCount,
      interestedCount,
      message: 'RSVP cancelled and removed from your calendar.',
    };
  }
}

@ApiTags('events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a campus event' })
  async createEvent(@CurrentUser() user: JwtPayload, @Body() dto: CreateEventDto) {
    return this.eventsService.create(user.institutionId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List campus events with category & time filters' })
  async listEvents(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: EventCategory,
    @Query('timeframe') timeframe?: 'all' | 'upcoming' | 'today' | 'this_week' | 'past',
    @Query('upcomingOnly') upcomingOnly?: boolean,
    @Query('organizationId') organizationId?: string,
    @Query('groupId') groupId?: string,
    @Query('courseId') courseId?: string,
    @Query('search') search?: string,
    @Query('rsvpStatus') rsvpStatus?: 'all' | 'going' | 'interested' | 'my_rsvps',
  ) {
    return this.eventsService.findAll(user.institutionId, user.sub, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      category,
      timeframe,
      upcomingOnly: upcomingOnly === true || String(upcomingOnly) === 'true',
      organizationId,
      groupId,
      courseId,
      search,
      rsvpStatus,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event details with student RSVP status' })
  async getEvent(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.eventsService.findOne(user.institutionId, id, user.sub);
  }

  @Post(':id/rsvp')
  @ApiOperation({ summary: 'Register or mark interested for an event' })
  async rsvpEvent(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const status = body?.status || body;
    return this.eventsService.setAttendance(user.institutionId, id, user.sub, status);
  }

  @Delete(':id/rsvp')
  @ApiOperation({ summary: 'Cancel event RSVP' })
  async cancelRsvp(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.eventsService.cancelAttendance(id, user.sub);
  }
}


@Module({
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
