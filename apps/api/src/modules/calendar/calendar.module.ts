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
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CalendarItemType } from '@prisma/client';

export class CreateCalendarItemDto {
  @ApiProperty({ example: 'CSC 301 Midterm Examination' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CalendarItemType, default: CalendarItemType.PERSONAL })
  @IsEnum(CalendarItemType)
  type!: CalendarItemType;

  @ApiProperty({ example: '2026-10-20T10:00:00.000Z' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ example: '2026-10-20T12:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiPropertyOptional({ example: '#4f46e5' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'LT1 - Science Complex' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  reminderAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseId?: string;
}

export class UpdateCalendarItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CalendarItemType })
  @IsOptional()
  @IsEnum(CalendarItemType)
  type?: CalendarItemType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'LT1 - Science Complex' })
  @IsOptional()
  @IsString()
  location?: string;
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function formatTimeSlot(start: string, end: string): string {
  function to12h(timeStr: string): string {
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m} ${ampm}`;
  }
  return `${to12h(start)} - ${to12h(end)}`;
}

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCalendarItemDto) {
    return this.prisma.calendarItem.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        allDay: dto.allDay || false,
        color: dto.color,
        location: dto.location,
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : null,
        courseId: dto.courseId,
      },
    });
  }

  /**
   * Returns unified student calendar schedule:
   * 1. Personal calendar items (Exams, Assignments, Study sessions)
   * 2. Campus events from EventAttendee
   * 3. Projected weekly recurring lecture occurrences for enrolled courses
   */
  async getCalendar(
    userId: string,
    institutionId: string,
    start: Date,
    end: Date,
    type?: CalendarItemType,
  ) {
    // 1. User's personal calendar items (exams, assignments, manual items)
    const personalItemsWhere: any = {
      userId,
      startDate: { gte: start, lte: end },
    };
    if (type) personalItemsWhere.type = type;

    const personalItems = await this.prisma.calendarItem.findMany({
      where: personalItemsWhere,
      include: {
        course: { select: { id: true, code: true, name: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    // 2. Campus events happening in this window that student is registered/interested in
    let eventCalendarItems: any[] = [];
    if (!type || type === CalendarItemType.EVENT) {
      const attendingEvents = await this.prisma.eventAttendee.findMany({
        where: {
          userId,
          event: {
            institutionId,
            startDate: { gte: start, lte: end },
          },
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              description: true,
              location: true,
              startDate: true,
              endDate: true,
              category: true,
            },
          },
        },
      });

      eventCalendarItems = attendingEvents.map((a) => ({
        id: `event_${a.event.id}`,
        userId,
        title: a.event.title,
        description: a.event.description,
        type: CalendarItemType.EVENT,
        startDate: a.event.startDate,
        endDate: a.event.endDate,
        allDay: false,
        color: '#3b82f6',
        eventId: a.event.id,
        location: a.event.location,
        venue: a.event.location,
        status: a.status,
      }));
    }

    // 3. Projected recurring course lecture occurrences for enrolled courses
    let projectedClassItems: any[] = [];
    if (!type || type === CalendarItemType.CLASS) {
      const enrollments = await this.prisma.courseEnrollment.findMany({
        where: { userId, course: { institutionId } },
        include: {
          course: {
            include: {
              schedules: true,
            },
          },
        },
      });

      const startTimeMs = start.getTime();
      const endTimeMs = end.getTime();

      for (const enrollment of enrollments) {
        const course = enrollment.course;
        for (const schedule of course.schedules) {
          // Iterate through all days in range to project matching recurring dayOfWeek
          const current = new Date(start);
          current.setHours(0, 0, 0, 0);

          while (current.getTime() <= endTimeMs) {
            // JS getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
            // Schema dayOfWeek: 1 = Mon, ..., 6 = Sat, 7 = Sun
            const jsDay = current.getDay();
            const schemaDay = jsDay === 0 ? 7 : jsDay;

            if (schemaDay === schedule.dayOfWeek) {
              const [startH, startM] = schedule.startTime.split(':').map(Number);
              const [endH, endM] = schedule.endTime.split(':').map(Number);

              const classStart = new Date(current);
              classStart.setHours(startH, startM, 0, 0);

              const classEnd = new Date(current);
              classEnd.setHours(endH, endM, 0, 0);

              if (classStart.getTime() >= startTimeMs && classStart.getTime() <= endTimeMs) {
                const dateStr = current.toISOString().split('T')[0];
                projectedClassItems.push({
                  id: `class_${schedule.id}_${dateStr}`,
                  scheduleId: schedule.id,
                  userId,
                  title: `${course.code}: ${course.name}`,
                  description: `Lecture with ${schedule.lecturerName || 'Course Lecturer'} at ${schedule.venue}`,
                  type: CalendarItemType.CLASS,
                  startDate: classStart.toISOString(),
                  endDate: classEnd.toISOString(),
                  allDay: false,
                  color: schedule.color || '#2563eb',
                  courseId: course.id,
                  course: { id: course.id, code: course.code, name: course.name },
                  venue: schedule.venue,
                  location: schedule.venue,
                  building: schedule.building,
                  lecturerName: schedule.lecturerName,
                  dayOfWeek: schedule.dayOfWeek,
                  dayName: DAY_NAMES[jsDay],
                  startTime: schedule.startTime,
                  endTime: schedule.endTime,
                  timeSlot: formatTimeSlot(schedule.startTime, schedule.endTime),
                });
              }
            }
            // Advance by 1 day
            current.setDate(current.getDate() + 1);
          }
        }
      }
    }

    return [...personalItems, ...eventCalendarItems, ...projectedClassItems].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
  }

  /**
   * Returns recurring weekly timetable grouped by day of week (Monday–Friday/Saturday)
   */
  async getTimetable(userId: string, institutionId: string) {
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { userId, course: { institutionId } },
      include: {
        course: {
          include: {
            schedules: true,
          },
        },
      },
    });

    const slots: any[] = [];
    let totalWeeklyHours = 0;

    for (const enrollment of enrollments) {
      const course = enrollment.course;
      for (const schedule of course.schedules) {
        const [startH, startM] = schedule.startTime.split(':').map(Number);
        const [endH, endM] = schedule.endTime.split(':').map(Number);
        const durationHours = endH - startH + (endM - startM) / 60;
        totalWeeklyHours += durationHours;

        // JS day mapping for dayName: 1 -> Mon (index 1), 7 -> Sun (index 0)
        const jsDayIndex = schedule.dayOfWeek === 7 ? 0 : schedule.dayOfWeek;

        slots.push({
          id: schedule.id,
          courseId: course.id,
          courseCode: course.code,
          courseName: course.name,
          courseUnits: course.units,
          dayOfWeek: schedule.dayOfWeek,
          dayName: DAY_NAMES[jsDayIndex],
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          timeSlot: formatTimeSlot(schedule.startTime, schedule.endTime),
          venue: schedule.venue,
          building: schedule.building,
          lecturerName: schedule.lecturerName,
          color: schedule.color || '#2563eb',
        });
      }
    }

    // Sort by dayOfWeek ascending, then startTime ascending
    slots.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });

    // Group by day of week
    const days: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
    for (const slot of slots) {
      if (days[slot.dayOfWeek]) {
        days[slot.dayOfWeek].push(slot);
      }
    }

    return {
      success: true,
      data: {
        slots,
        days,
        totalCourses: enrollments.length,
        totalWeeklyHours,
      },
    };
  }

  /**
   * Returns today's classes and events for student dashboard widget
   */
  async getTodaySchedule(userId: string, institutionId: string, clientDate?: string) {
    const today = clientDate ? new Date(clientDate) : new Date();
    const jsDay = today.getDay();
    const schemaDay = jsDay === 0 ? 7 : jsDay;

    // 1. Get today's enrolled course lecture slots
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { userId, course: { institutionId } },
      include: {
        course: {
          include: {
            schedules: {
              where: { dayOfWeek: schemaDay },
            },
          },
        },
      },
    });

    const nowMinutes = today.getHours() * 60 + today.getMinutes();

    const todayClasses: any[] = [];
    for (const enrollment of enrollments) {
      const course = enrollment.course;
      for (const schedule of course.schedules) {
        const [startH, startM] = schedule.startTime.split(':').map(Number);
        const [endH, endM] = schedule.endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        let status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' = 'UPCOMING';
        if (nowMinutes >= endMinutes) {
          status = 'COMPLETED';
        } else if (nowMinutes >= startMinutes && nowMinutes < endMinutes) {
          status = 'ONGOING';
        }

        todayClasses.push({
          id: `today_${schedule.id}`,
          scheduleId: schedule.id,
          courseId: course.id,
          courseCode: course.code,
          courseName: course.name,
          timeSlot: formatTimeSlot(schedule.startTime, schedule.endTime),
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          venue: schedule.venue,
          building: schedule.building,
          lecturerName: schedule.lecturerName,
          color: schedule.color || '#2563eb',
          status,
        });
      }
    }

    todayClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // 2. Get today's personal deadlines and exams
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const personalToday = await this.prisma.calendarItem.findMany({
      where: {
        userId,
        startDate: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        course: { select: { code: true, name: true } },
      },
    });

    return {
      success: true,
      data: {
        date: today.toISOString().split('T')[0],
        dayOfWeek: schemaDay,
        dayName: DAY_NAMES[jsDay],
        classes: todayClasses,
        personalItems: personalToday,
        totalCount: todayClasses.length + personalToday.length,
      },
    };
  }

  async update(id: string, userId: string, dto: UpdateCalendarItemDto) {
    const item = await this.prisma.calendarItem.findFirst({
      where: { id, userId },
    });
    if (!item) throw new NotFoundException('Calendar item not found.');

    return this.prisma.calendarItem.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async delete(id: string, userId: string) {
    const item = await this.prisma.calendarItem.findFirst({
      where: { id, userId },
    });
    if (!item) throw new NotFoundException('Calendar item not found.');

    await this.prisma.calendarItem.delete({ where: { id } });
    return { success: true, message: 'Calendar item removed.' };
  }
}

@ApiTags('calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('timetable')
  @ApiOperation({ summary: 'Get weekly recurring course timetable for enrolled student' })
  async getTimetable(@CurrentUser() user: JwtPayload) {
    return this.calendarService.getTimetable(user.sub, user.institutionId);
  }

  @Get('today')
  @ApiOperation({ summary: 'Get student classes, exams, and schedule items for today' })
  async getTodaySchedule(
    @CurrentUser() user: JwtPayload,
    @Query('clientDate') clientDate?: string,
  ) {
    return this.calendarService.getTodaySchedule(user.sub, user.institutionId, clientDate);
  }

  @Post()
  @ApiOperation({ summary: 'Add a personal schedule item, assignment, or exam' })
  async createItem(@CurrentUser() user: JwtPayload, @Body() dto: CreateCalendarItemDto) {
    return this.calendarService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get unified student campus schedule in date range' })
  async getCalendar(
    @CurrentUser() user: JwtPayload,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('type') type?: CalendarItemType,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 86400000);
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 86400000);
    return this.calendarService.getCalendar(user.sub, user.institutionId, start, end, type);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update calendar item' })
  async updateItem(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarItemDto,
  ) {
    return this.calendarService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete calendar item' })
  async deleteItem(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.calendarService.delete(id, user.sub);
  }
}

@Module({
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
