import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SubmitVerificationDto } from './dto/verification-request.dto';
import { paginate, getPaginationSkipTake } from '../../common/helpers/pagination.helper';
import { VerificationStatus, UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            faculty: { select: { id: true, name: true, shortName: true } },
            department: { select: { id: true, name: true, shortName: true } },
            programme: { select: { id: true, name: true, shortName: true } },
          },
        },
        institution: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        _count: {
          select: {
            posts: true,
            groupMemberships: true,
            courseEnrollments: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Student profile not found.',
      });
    }

    // Compute academic reputation & peer contribution breakdown
    const [answersCount, acceptedAnswersCount, upvotesReceived, coursesContributed] = await Promise.all([
      this.prisma.answer.count({
        where: { authorId: userId },
      }),
      this.prisma.answer.count({
        where: { authorId: userId, isMarkedHelpful: true },
      }),
      this.prisma.reaction.count({
        where: {
          type: 'LIKE',
          answer: { authorId: userId },
        },
      }),
      this.prisma.answer.findMany({
        where: { authorId: userId },
        select: {
          isMarkedHelpful: true,
          question: {
            select: {
              course: {
                select: { code: true, name: true },
              },
            },
          },
        },
      }),
    ]);

    const points = user.profile?.reputationPoints ?? 0;

    let tier = 'Active Learner';
    let nextTierPoints = 15;
    if (points >= 100) {
      tier = 'Campus Mentor';
      nextTierPoints = 250;
    } else if (points >= 50) {
      tier = 'Course Scholar';
      nextTierPoints = 100;
    } else if (points >= 15) {
      tier = 'Peer Contributor';
      nextTierPoints = 50;
    }

    const badges: { id: string; label: string; description: string; icon: string }[] = [];

    // Milestone badges
    if (points >= 15) {
      badges.push({
        id: 'peer-contributor',
        label: 'Peer Contributor',
        description: 'Earned 15+ reputation points helping university peers',
        icon: '🥉',
      });
    }
    if (points >= 50) {
      badges.push({
        id: 'course-scholar',
        label: 'Course Scholar',
        description: 'Earned 50+ reputation points with high-quality coursework explanations',
        icon: '🥈',
      });
    }
    if (points >= 100) {
      badges.push({
        id: 'campus-mentor',
        label: 'Campus Mentor',
        description: 'Earned 100+ reputation points and recognized as a leading campus mentor',
        icon: '🥇',
      });
    }

    // Course-specific badges
    const courseCodesWithAccepted = new Set<string>();
    const courseCodesWithAnswers = new Set<string>();
    coursesContributed.forEach((c) => {
      const code = c.question?.course?.code;
      if (code) {
        courseCodesWithAnswers.add(code);
        if (c.isMarkedHelpful) {
          courseCodesWithAccepted.add(code);
        }
      }
    });

    courseCodesWithAccepted.forEach((code) => {
      badges.push({
        id: `${code.toLowerCase().replace(/\s+/g, '-')}-top-contributor`,
        label: `${code} Top Contributor`,
        description: `Verified accepted solution author for ${code} coursework`,
        icon: '🏆',
      });
    });

    courseCodesWithAnswers.forEach((code) => {
      if (!courseCodesWithAccepted.has(code) && points >= 15) {
        badges.push({
          id: `${code.toLowerCase().replace(/\s+/g, '-')}-contributor`,
          label: `${code} Contributor`,
          description: `Active answers contributor for ${code}`,
          icon: '🎓',
        });
      }
    });

    const reputation = {
      points,
      tier,
      nextTierPoints,
      badges,
      breakdown: {
        totalAnswers: answersCount,
        acceptedAnswers: acceptedAnswersCount,
        upvotesReceived,
      },
    };

    const { passwordHash: _, ...safeUser } = user;
    return {
      ...safeUser,
      reputation,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile record not found.');
    }

    // Validate academic foreign keys if supplied
    if (dto.facultyId) {
      const faculty = await this.prisma.faculty.findUnique({
        where: { id: dto.facultyId },
      });
      if (!faculty) throw new BadRequestException('Selected faculty does not exist.');
    }

    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!dept) throw new BadRequestException('Selected department does not exist.');
    }

    if (dto.programmeId) {
      const prog = await this.prisma.programme.findUnique({
        where: { id: dto.programmeId },
      });
      if (!prog) throw new BadRequestException('Selected programme does not exist.');
    }

    const updated = await this.prisma.profile.update({
      where: { userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        displayName: dto.displayName,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
        coverImageUrl: dto.coverImageUrl,
        phone: dto.phone,
        website: dto.website,
        location: dto.location,
        interests: dto.interests,
        skills: dto.skills,
        facultyId: dto.facultyId,
        departmentId: dto.departmentId,
        programmeId: dto.programmeId,
        level: dto.level,
        studentId: dto.studentId,
        admissionNo: dto.admissionNo,
        matricNo: dto.matricNo,
        graduationYear: dto.graduationYear,
        showEmail: dto.showEmail,
        showPhone: dto.showPhone,
        showDOB: dto.showDOB,
      },
      include: {
        faculty: true,
        department: true,
        programme: true,
      },
    });

    return updated;
  }

  async submitVerification(userId: string, dto: SubmitVerificationDto) {
    const existing = await this.prisma.verificationRequest.findUnique({
      where: { userId },
    });

    if (existing && existing.status === VerificationStatus.PENDING) {
      throw new ConflictException({
        code: 'VERIFICATION_ALREADY_PENDING',
        message: 'A verification request is already under review for your account.',
      });
    }

    const request = await this.prisma.verificationRequest.upsert({
      where: { userId },
      update: {
        method: dto.method,
        submittedData: dto.submittedData as any,
        status: VerificationStatus.PENDING,
        reviewNote: null,
      },
      create: {
        userId,
        method: dto.method,
        submittedData: dto.submittedData as any,
        status: VerificationStatus.PENDING,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: VerificationStatus.PENDING },
    });

    return request;
  }

  async listStudents(
    institutionId: string,
    query: {
      page?: number;
      limit?: number;
      facultyId?: string;
      departmentId?: string;
      programmeId?: string;
      level?: number;
      search?: string;
    },
  ) {
    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const where: any = {
      institutionId,
      role: UserRole.STUDENT,
      isActive: true,
      isDeactivated: false,
    };

    if (query.facultyId) where.profile = { ...where.profile, facultyId: query.facultyId };
    if (query.departmentId) where.profile = { ...where.profile, departmentId: query.departmentId };
    if (query.programmeId) where.profile = { ...where.profile, programmeId: query.programmeId };
    if (query.level) where.profile = { ...where.profile, level: query.level };

    if (query.search) {
      where.OR = [
        { profile: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { profile: { lastName: { contains: query.search, mode: 'insensitive' } } },
        { profile: { displayName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [students, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          verificationStatus: true,
          createdAt: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
              bio: true,
              level: true,
              reputationPoints: true,
              faculty: { select: { id: true, name: true, shortName: true } },
              department: { select: { id: true, name: true, shortName: true } },
              programme: { select: { id: true, name: true, shortName: true } },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(students, total, page, limit);
  }

  async blockUser(blockerId: string, targetUserId: string) {
    if (blockerId === targetUserId) {
      throw new BadRequestException('You cannot block yourself.');
    }

    await this.prisma.userBlock.upsert({
      where: {
        blockerId_blockedId: { blockerId, blockedId: targetUserId },
      },
      update: {},
      create: { blockerId, blockedId: targetUserId },
    });

    return { success: true, message: 'User blocked.' };
  }

  async unblockUser(blockerId: string, targetUserId: string) {
    await this.prisma.userBlock.deleteMany({
      where: { blockerId, blockedId: targetUserId },
    });

    return { success: true, message: 'User unblocked.' };
  }
}
