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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Module } from '@nestjs/common';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { paginate, getPaginationSkipTake } from '../../common/helpers/pagination.helper';

export class CreateQuestionDto {
  @ApiProperty({ example: 'Can someone explain recursion with a real-world stack example?' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'I am struggling with the base case in divide and conquer algorithms...' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ example: ['recursion', 'algorithms', 'csc301'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}

export class CreateAnswerDto {
  @ApiProperty({ example: 'Think of recursion like Russian nesting dolls...' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(institutionId: string, authorId: string, dto: CreateQuestionDto) {
    if (dto.courseId) {
      const course = await this.prisma.course.findFirst({
        where: { id: dto.courseId, institutionId },
      });
      if (!course) throw new NotFoundException('Course not found.');
    }

    return this.prisma.question.create({
      data: {
        institutionId,
        authorId,
        title: dto.title,
        content: dto.content,
        tags: dto.tags || [],
        courseId: dto.courseId,
        isAnonymous: dto.isAnonymous || false,
      },
      include: {
        author: {
          select: {
            id: true,
            verificationStatus: true,
            profile: {
              select: { firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
        course: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async findAll(
    institutionId: string,
    query: {
      page?: number;
      limit?: number;
      courseId?: string;
      tag?: string;
      search?: string;
      filter?: 'all' | 'my-courses' | 'unanswered' | 'most-upvoted';
      userId?: string;
    },
  ) {
    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const where: any = { institutionId };
    if (query.courseId) where.courseId = query.courseId;
    if (query.tag) where.tags = { has: query.tag };
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.filter === 'unanswered') {
      where.answerCount = 0;
    } else if (query.filter === 'my-courses' && query.userId) {
      const enrollments = await this.prisma.courseEnrollment.findMany({
        where: { userId: query.userId },
        select: { courseId: true },
      });
      const enrolledIds = enrollments.map((e) => e.courseId);
      where.courseId = { in: enrolledIds };
    }

    let orderBy: any = { createdAt: 'desc' };
    if (query.filter === 'most-upvoted') {
      orderBy = [{ upvoteCount: 'desc' }, { answerCount: 'desc' }, { createdAt: 'desc' }];
    }

    const [questions, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              verificationStatus: true,
              profile: {
                select: { firstName: true, lastName: true, avatarUrl: true },
              },
            },
          },
          course: { select: { id: true, code: true, name: true } },
          answers: {
            where: { isMarkedHelpful: true },
            take: 1,
            select: {
              id: true,
              content: true,
              isMarkedHelpful: true,
              author: {
                select: {
                  profile: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
          reactions: query.userId
            ? {
                where: { userId: query.userId, type: 'LIKE' },
                select: { id: true },
              }
            : false,
          _count: { select: { answers: true } },
        },
      }),
      this.prisma.question.count({ where }),
    ]);

    // Mask author info if anonymous and enrich with isUpvoted, isResolved, acceptedAnswerSnippet
    const sanitized = questions.map((q) => {
      const acceptedAnswer = q.answers && q.answers.length > 0 ? q.answers[0] : null;
      return {
        ...q,
        author: q.isAnonymous ? null : q.author,
        isUpvoted: Boolean(q.reactions && q.reactions.length > 0),
        isResolved: Boolean(acceptedAnswer),
        acceptedAnswerSnippet: acceptedAnswer ? acceptedAnswer.content.slice(0, 180) : null,
      };
    });

    return paginate(sanitized, total, page, limit);
  }

  async findOne(institutionId: string, id: string, userId?: string) {
    const question = await this.prisma.question.findFirst({
      where: { id, institutionId },
      include: {
        author: {
          select: {
            id: true,
            verificationStatus: true,
            profile: {
              select: { firstName: true, lastName: true, avatarUrl: true, level: true, reputationPoints: true },
            },
          },
        },
        course: { select: { id: true, code: true, name: true } },
        reactions: userId
          ? {
              where: { userId, type: 'LIKE' },
              select: { id: true },
            }
          : false,
        answers: {
          orderBy: [{ isMarkedHelpful: 'desc' }, { createdAt: 'asc' }],
          include: {
            author: {
              select: {
                id: true,
                verificationStatus: true,
                profile: {
                  select: { firstName: true, lastName: true, avatarUrl: true, level: true, reputationPoints: true },
                },
              },
            },
            reactions: {
              select: { id: true, userId: true, type: true },
            },
          },
        },
      },
    });

    if (!question) throw new NotFoundException('Question not found.');

    // Increment view count
    void this.prisma.question.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return {
      ...question,
      author: question.isAnonymous ? null : question.author,
      isUpvoted: Boolean(question.reactions && question.reactions.length > 0),
      answers: question.answers.map((a) => {
        const likeReactions = a.reactions.filter((r) => r.type === 'LIKE');
        const rep = a.author?.profile?.reputationPoints ?? 0;
        const badges: string[] = [];
        if (rep >= 100) badges.push('Campus Mentor');
        else if (rep >= 50) badges.push('Course Scholar');
        else if (rep >= 15) badges.push('Peer Contributor');
        if (question.course?.code && (rep >= 15 || a.isMarkedHelpful)) {
          badges.push(`${question.course.code} Contributor`);
        }

        return {
          ...a,
          author: a.isAnonymous
            ? null
            : {
                ...a.author,
                badges,
                profile: a.author?.profile
                  ? {
                      ...a.author.profile,
                      reputationPoints: rep,
                      badges,
                    }
                  : null,
              },
          upvoteCount: likeReactions.length,
          helpfulCount: likeReactions.length,
          isUpvoted: Boolean(userId && likeReactions.some((r) => r.userId === userId)),
        };
      }),
    };
  }

  async addAnswer(questionId: string, authorId: string, dto: CreateAnswerDto) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException('Question not found.');

    return this.prisma.$transaction(async (tx) => {
      const answer = await tx.answer.create({
        data: {
          questionId,
          authorId,
          content: dto.content,
          isAnonymous: dto.isAnonymous || false,
        },
        include: {
          author: {
            select: {
              id: true,
              verificationStatus: true,
              profile: {
                select: { firstName: true, lastName: true, avatarUrl: true, level: true, reputationPoints: true },
              },
            },
          },
        },
      });

      await tx.question.update({
        where: { id: questionId },
        data: { answerCount: { increment: 1 } },
      });

      return {
        ...answer,
        author: answer.isAnonymous ? null : answer.author,
        upvoteCount: 0,
        helpfulCount: 0,
        isUpvoted: false,
        isMarkedHelpful: false,
      };
    });
  }

  async markAnswerHelpful(
    questionId: string,
    answerId: string,
    userId: string,
    userRole?: string,
  ) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException('Question not found.');

    const isAuthor = question.authorId === userId;
    const isAdmin = userRole === 'UNIVERSITY_ADMIN' || userRole === 'SUPER_ADMIN';

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException(
        'Only the student who asked this question (or an administrator) can mark an answer helpful.',
      );
    }

    const answer = await this.prisma.answer.findFirst({
      where: { id: answerId, questionId },
    });
    if (!answer) throw new NotFoundException('Answer not found on this question.');

    return this.prisma.$transaction(async (tx) => {
      const willBeHelpful = !answer.isMarkedHelpful;
      if (willBeHelpful) {
        // Guarantee single accepted solution: unmark previous accepted answer
        const previousAccepted = await tx.answer.findFirst({
          where: { questionId, isMarkedHelpful: true },
          select: { id: true, authorId: true },
        });

        if (previousAccepted && previousAccepted.id !== answerId) {
          await tx.answer.update({
            where: { id: previousAccepted.id },
            data: { isMarkedHelpful: false },
          });
          const prevProfile = await tx.profile.findUnique({
            where: { userId: previousAccepted.authorId },
          });
          if (prevProfile) {
            await tx.profile.update({
              where: { userId: previousAccepted.authorId },
              data: { reputationPoints: Math.max(0, prevProfile.reputationPoints - 15) },
            });
          }
        }

        // Award +15 reputation points to the answer author
        const authorProfile = await tx.profile.findUnique({
          where: { userId: answer.authorId },
        });
        if (authorProfile) {
          await tx.profile.update({
            where: { userId: answer.authorId },
            data: { reputationPoints: authorProfile.reputationPoints + 15 },
          });
        }
      } else {
        // Unmarking accepted solution: deduct 15 points (min 0)
        const authorProfile = await tx.profile.findUnique({
          where: { userId: answer.authorId },
        });
        if (authorProfile) {
          await tx.profile.update({
            where: { userId: answer.authorId },
            data: { reputationPoints: Math.max(0, authorProfile.reputationPoints - 15) },
          });
        }
      }

      return tx.answer.update({
        where: { id: answerId },
        data: { isMarkedHelpful: willBeHelpful },
        include: {
          author: {
            select: {
              id: true,
              verificationStatus: true,
              profile: {
                select: { firstName: true, lastName: true, avatarUrl: true, level: true, reputationPoints: true },
              },
            },
          },
        },
      });
    });
  }

  async toggleUpvote(institutionId: string, questionId: string, userId: string) {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, institutionId },
    });
    if (!question) throw new NotFoundException('Question not found.');

    return this.prisma.$transaction(async (tx) => {
      const existingReaction = await tx.reaction.findUnique({
        where: {
          userId_questionId: {
            userId,
            questionId,
          },
        },
      });

      if (existingReaction) {
        await tx.reaction.delete({
          where: { id: existingReaction.id },
        });
        const updated = await tx.question.update({
          where: { id: questionId },
          data: { upvoteCount: { decrement: 1 } },
          select: { id: true, upvoteCount: true },
        });
        return {
          questionId,
          isUpvoted: false,
          upvoteCount: Math.max(0, updated.upvoteCount),
        };
      } else {
        await tx.reaction.create({
          data: {
            userId,
            questionId,
            type: 'LIKE',
          },
        });
        const updated = await tx.question.update({
          where: { id: questionId },
          data: { upvoteCount: { increment: 1 } },
          select: { id: true, upvoteCount: true },
        });
        return {
          questionId,
          isUpvoted: true,
          upvoteCount: updated.upvoteCount,
        };
      }
    });
  }

  async toggleAnswerUpvote(
    institutionId: string,
    questionId: string,
    answerId: string,
    userId: string,
  ) {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, institutionId },
    });
    if (!question) throw new NotFoundException('Question not found.');

    const answer = await this.prisma.answer.findFirst({
      where: { id: answerId, questionId },
    });
    if (!answer) throw new NotFoundException('Answer not found on this question.');

    return this.prisma.$transaction(async (tx) => {
      const existingReaction = await tx.reaction.findUnique({
        where: {
          userId_answerId: {
            userId,
            answerId,
          },
        },
      });

      const authorProfile = await tx.profile.findUnique({
        where: { userId: answer.authorId },
      });

      if (existingReaction) {
        await tx.reaction.delete({
          where: { id: existingReaction.id },
        });
        const count = await tx.reaction.count({
          where: { answerId, type: 'LIKE' },
        });

        let updatedRep = authorProfile?.reputationPoints ?? 0;
        if (authorProfile) {
          updatedRep = Math.max(0, authorProfile.reputationPoints - 5);
          await tx.profile.update({
            where: { userId: answer.authorId },
            data: { reputationPoints: updatedRep },
          });
        }

        return {
          answerId,
          isUpvoted: false,
          upvoteCount: count,
          authorReputationPoints: updatedRep,
        };
      } else {
        await tx.reaction.create({
          data: {
            userId,
            answerId,
            type: 'LIKE',
          },
        });
        const count = await tx.reaction.count({
          where: { answerId, type: 'LIKE' },
        });

        let updatedRep = (authorProfile?.reputationPoints ?? 0) + 5;
        if (authorProfile) {
          await tx.profile.update({
            where: { userId: answer.authorId },
            data: { reputationPoints: updatedRep },
          });
        }

        return {
          answerId,
          isUpvoted: true,
          upvoteCount: count,
          authorReputationPoints: updatedRep,
        };
      }
    });
  }
}

@ApiTags('questions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @ApiOperation({ summary: 'Ask an academic or course question' })
  async createQuestion(@CurrentUser() user: JwtPayload, @Body() dto: CreateQuestionDto) {
    return this.questionsService.create(user.institutionId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Browse academic questions by course or topic' })
  async listQuestions(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('courseId') courseId?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
    @Query('filter') filter?: 'all' | 'my-courses' | 'unanswered' | 'most-upvoted',
  ) {
    return this.questionsService.findAll(user.institutionId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      courseId,
      tag,
      search,
      filter,
      userId: user.sub,
    });
  }

  @Post(':id/upvote')
  @ApiOperation({ summary: 'Toggle upvote on an academic question' })
  async toggleUpvote(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.questionsService.toggleUpvote(user.institutionId, id, user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get question with community answers and accepted solution' })
  async getQuestion(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.questionsService.findOne(user.institutionId, id, user.sub);
  }

  @Post(':id/answers')
  @ApiOperation({ summary: 'Submit an answer to an academic question' })
  async addAnswer(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateAnswerDto,
  ) {
    return this.questionsService.addAnswer(id, user.sub, dto);
  }

  @Patch(':id/answers/:answerId/helpful')
  @ApiOperation({ summary: 'Mark answer as helpful (Question author only)' })
  async markHelpful(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('answerId') answerId: string,
  ) {
    return this.questionsService.markAnswerHelpful(id, answerId, user.sub, user.role);
  }

  @Post(':id/answers/:answerId/upvote')
  @ApiOperation({ summary: 'Toggle upvote on an answer' })
  async toggleAnswerUpvote(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('answerId') answerId: string,
  ) {
    return this.questionsService.toggleAnswerUpvote(user.institutionId, id, answerId, user.sub);
  }
}

@Module({
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
