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
  ConflictException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
import { paginate, getPaginationSkipTake } from '../../common/helpers/pagination.helper';

export class CreateCourseDto {
  @ApiProperty({ example: 'CSC 301' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'Data Structures and Algorithms' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 3, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  units?: number;

  @ApiPropertyOptional({ example: 300 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(900)
  level?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2)
  semester?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  programmeId?: string;
}

export class UpdateCourseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  units?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  level?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  semester?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  programmeId?: string;
}

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    institutionId: string,
    query: {
      page?: number;
      limit?: number;
      programmeId?: string;
      level?: number;
      semester?: number;
      search?: string;
      myEnrolledOnly?: boolean;
      userId?: string;
    },
  ) {
    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const where: any = { institutionId };
    if (query.programmeId) where.programmeId = query.programmeId;
    if (query.level) where.level = query.level;
    if (query.semester) where.semester = query.semester;

    if (query.myEnrolledOnly && query.userId) {
      where.enrollments = {
        some: { userId: query.userId },
      };
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take,
        orderBy: [{ level: 'asc' }, { code: 'asc' }],
        include: {
          programme: { select: { id: true, name: true, shortName: true } },
          _count: {
            select: {
              enrollments: true,
              posts: true,
              resources: true,
              questions: true,
            },
          },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return paginate(courses, total, page, limit);
  }

  async resolveCourse(institutionId: string, idOrCode: string) {
    const raw = idOrCode.trim();
    const formattedWithSpace = raw.replace(/[-_]/g, ' ').toUpperCase();
    const compact = raw.replace(/[\s\-_]/g, '').toUpperCase();

    let course = await this.prisma.course.findFirst({
      where: {
        institutionId,
        OR: [
          { id: raw },
          { code: raw.toUpperCase() },
          { code: formattedWithSpace },
        ],
      },
    });

    if (!course) {
      const allCourses = await this.prisma.course.findMany({
        where: { institutionId },
      });
      course =
        allCourses.find(
          (c) => c.code.replace(/[\s\-_]/g, '').toUpperCase() === compact,
        ) || null;
    }

    return course;
  }

  async findOne(institutionId: string, idOrCode: string, userId?: string) {
    const matched = await this.resolveCourse(institutionId, idOrCode);
    if (!matched) throw new NotFoundException(`Course community "${idOrCode}" not found.`);

    const course = await this.prisma.course.findUnique({
      where: { id: matched.id },
      include: {
        programme: {
          include: {
            department: {
              include: { faculty: true },
            },
          },
        },
        posts: {
          take: 15,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                verificationStatus: true,
                role: true,
                profile: {
                  select: { firstName: true, lastName: true, displayName: true, avatarUrl: true, level: true },
                },
              },
            },
            _count: { select: { comments: true, reactions: true } },
          },
        },
        resources: {
          take: 15,
          orderBy: { createdAt: 'desc' },
          include: {
            uploader: {
              select: {
                id: true,
                profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
              },
            },
          },
        },
        questions: {
          take: 15,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
              },
            },
            _count: { select: { answers: true, bookmarks: true } },
          },
        },
        announcements: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            enrollments: true,
            posts: true,
            resources: true,
            questions: true,
            announcements: true,
          },
        },
      },
    });

    if (!course) throw new NotFoundException('Course community not found.');

    let isEnrolled = false;
    if (userId) {
      const enrollment = await this.prisma.courseEnrollment.findUnique({
        where: { userId_courseId: { userId, courseId: course.id } },
      });
      isEnrolled = !!enrollment;
    }

    return { ...course, isEnrolled };
  }

  async getMyCourses(institutionId: string, userId: string) {
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { userId, course: { institutionId } },
      include: {
        course: {
          include: {
            programme: { select: { id: true, name: true, shortName: true } },
            _count: {
              select: {
                enrollments: true,
                posts: true,
                resources: true,
                questions: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return enrollments.map((e) => ({
      ...e.course,
      isEnrolled: true,
      enrolledAt: e.createdAt,
    }));
  }

  async enroll(institutionId: string, idOrCode: string, userId: string) {
    const course = await this.resolveCourse(institutionId, idOrCode);
    if (!course) throw new NotFoundException('Course not found.');

    const existing = await this.prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    });

    if (existing) {
      throw new ConflictException('Already enrolled in this course community.');
    }

    return this.prisma.courseEnrollment.create({
      data: { userId, courseId: course.id },
      include: {
        course: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async unenroll(institutionId: string, idOrCode: string, userId: string) {
    const course = await this.resolveCourse(institutionId, idOrCode);
    if (!course) throw new NotFoundException('Course not found.');

    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    });

    if (!enrollment) {
      throw new NotFoundException('You are not currently enrolled in this course.');
    }

    await this.prisma.courseEnrollment.delete({
      where: { id: enrollment.id },
    });

    return { success: true, message: 'Unenrolled from course community.' };
  }

  async getMembers(
    institutionId: string,
    idOrCode: string,
    query: { page?: number; limit?: number },
  ) {
    const course = await this.resolveCourse(institutionId, idOrCode);
    if (!course) throw new NotFoundException('Course not found.');

    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const [members, total] = await Promise.all([
      this.prisma.courseEnrollment.findMany({
        where: { courseId: course.id },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
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
          },
        },
      }),
      this.prisma.courseEnrollment.count({ where: { courseId: course.id } }),
    ]);

    return paginate(members, total, page, limit);
  }

  async create(institutionId: string, dto: CreateCourseDto) {
    const existing = await this.prisma.course.findUnique({
      where: {
        institutionId_code: { institutionId, code: dto.code.trim().toUpperCase() },
      },
    });

    if (existing) {
      throw new ConflictException({
        code: 'COURSE_CODE_EXISTS',
        message: `Course with code ${dto.code} already exists in this institution.`,
      });
    }

    return this.prisma.course.create({
      data: {
        institutionId,
        code: dto.code.trim().toUpperCase(),
        name: dto.name,
        description: dto.description,
        units: dto.units || 3,
        level: dto.level,
        semester: dto.semester,
        programmeId: dto.programmeId,
      },
    });
  }

  async update(institutionId: string, id: string, dto: UpdateCourseDto) {
    await this.findOne(institutionId, id);
    return this.prisma.course.update({
      where: { id },
      data: {
        ...dto,
        code: dto.code ? dto.code.trim().toUpperCase() : undefined,
      },
    });
  }

  async delete(institutionId: string, id: string) {
    await this.findOne(institutionId, id);
    await this.prisma.course.delete({ where: { id } });
    return { success: true, message: 'Course community deleted.' };
  }
}

@ApiTags('courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'List and search course communities with filters' })
  async listCourses(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('programmeId') programmeId?: string,
    @Query('level') level?: number,
    @Query('semester') semester?: number,
    @Query('search') search?: string,
    @Query('enrolledOnly') enrolledOnly?: boolean,
  ) {
    return this.coursesService.findAll(user.institutionId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      programmeId,
      level: level ? Number(level) : undefined,
      semester: semester ? Number(semester) : undefined,
      search,
      myEnrolledOnly: enrolledOnly === true || String(enrolledOnly) === 'true',
      userId: user.sub,
    });
  }

  @Get('my-courses')
  @ApiOperation({ summary: 'Get current student enrolled courses' })
  async getMyCourses(@CurrentUser() user: JwtPayload) {
    return this.coursesService.getMyCourses(user.institutionId, user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course community hub, overview and stats' })
  async getCourse(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.coursesService.findOne(user.institutionId, id, user.sub);
  }

  @Post(':id/enroll')
  @ApiOperation({ summary: 'Enroll in course community' })
  async enroll(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.coursesService.enroll(user.institutionId, id, user.sub);
  }

  @Delete(':id/enroll')
  @ApiOperation({ summary: 'Leave course community' })
  async unenroll(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.coursesService.unenroll(user.institutionId, id, user.sub);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List peers enrolled in course community' })
  async getMembers(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.coursesService.getMembers(user.institutionId, id, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Roles(UserRole.UNIVERSITY_ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create course community (Admin only)' })
  async createCourse(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCourseDto,
  ) {
    return this.coursesService.create(user.institutionId, dto);
  }

  @Roles(UserRole.UNIVERSITY_ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update course community (Admin only)' })
  async updateCourse(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.coursesService.update(user.institutionId, id, dto);
  }

  @Roles(UserRole.UNIVERSITY_ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete course community (Admin only)' })
  async deleteCourse(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.coursesService.delete(user.institutionId, id);
  }
}

@Module({
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
