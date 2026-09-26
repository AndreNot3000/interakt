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
      },
    });

    // Auto-create calendar item for organizer
    await this.prisma.calendarItem.create({
      data: {
        userId,
        title: event.title,
        description: event.description,
        type: CalendarItemType.EVENT,
        startDate: event.startDate,
        endDate: event.endDate,
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
      upcomingOnly?: boolean;
      organizationId?: string;
      groupId?: string;
      courseId?: string;
      search?: string;
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
    if (query.upcomingOnly) {
      where.endDate = { gte: new Date() };
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
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

    const formatted = events.map((event) => ({
      ...event,
      userStatus: event.attendees[0]?.status || null,
      attendees: undefined,
    }));

    return paginate(formatted, total, page, limit);
  }

  async findOne(institutionId: string, id: string, userId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, institutionId },
      include: {
        organization: { select: { id: true, name: true, avatarUrl: true, isOfficial: true } },
        group: { select: { id: true, name: true } },
        attendees: {
          where: { userId },
          select: { status: true },
        },
      },
    });

    if (!event) throw new NotFoundException('Event not found.');

    return {
      ...event,
      userStatus: event.attendees[0]?.status || null,
      attendees: undefined,
    };
  }

  async setAttendance(
    institutionId: string,
    eventId: string,
    userId: string,
    status: AttendanceStatus,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, institutionId },
    });
    if (!event) throw new NotFoundException('Event not found.');

    if (status === AttendanceStatus.REGISTERED && event.capacity) {
      const registeredCount = await this.prisma.eventAttendee.count({
        where: { eventId, status: AttendanceStatus.REGISTERED },
      });
      if (registeredCount >= event.capacity) {
        throw new BadRequestException('This event has reached full capacity.');
      }
    }

    await this.prisma.eventAttendee.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: { status },
      create: { eventId, userId, status },
    });

    // Sync to user calendar
    if (status === AttendanceStatus.REGISTERED || status === AttendanceStatus.INTERESTED) {
      await this.prisma.calendarItem.upsert({
        where: { id: `event_${eventId}_${userId}` },
        update: {
          startDate: event.startDate,
          endDate: event.endDate,
        },
        create: {
          id: `event_${eventId}_${userId}`,
          userId,
          title: event.title,
          description: event.description,
          type: CalendarItemType.EVENT,
          startDate: event.startDate,
          endDate: event.endDate,
          eventId: event.id,
        },
      });
    }

    // Refresh counts
    const [attendeeCount, interestedCount] = await Promise.all([
      this.prisma.eventAttendee.count({ where: { eventId, status: AttendanceStatus.REGISTERED } }),
      this.prisma.eventAttendee.count({ where: { eventId, status: AttendanceStatus.INTERESTED } }),
    ]);

    await this.prisma.event.update({
      where: { id: eventId },
      data: { attendeeCount, interestedCount },
    });

    return { success: true, status, message: `Event marked as ${status.toLowerCase()}.` };
  }

  async cancelAttendance(eventId: string, userId: string) {
    await this.prisma.eventAttendee.deleteMany({
      where: { eventId, userId },
    });

    // Remove from calendar
    await this.prisma.calendarItem.deleteMany({
      where: { eventId, userId },
    });

    return { success: true, message: 'Attendance cancelled.' };
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
    @Query('upcomingOnly') upcomingOnly?: boolean,
    @Query('organizationId') organizationId?: string,
    @Query('groupId') groupId?: string,
    @Query('courseId') courseId?: string,
    @Query('search') search?: string,
  ) {
    return this.eventsService.findAll(user.institutionId, user.sub, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      category,
      upcomingOnly: upcomingOnly === true || String(upcomingOnly) === 'true',
      organizationId,
      groupId,
      courseId,
      search,
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
    @Body('status') status: AttendanceStatus,
  ) {
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
