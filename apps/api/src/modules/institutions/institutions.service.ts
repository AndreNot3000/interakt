import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateInstitutionDto, UpdateInstitutionDto } from './dto/institution.dto';
import { createSlug } from '../../common/helpers/slugify.helper';
import { paginate, getPaginationSkipTake } from '../../common/helpers/pagination.helper';
import { InstitutionStatus } from '@prisma/client';

@Injectable()
export class InstitutionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInstitutionDto) {
    const slug = createSlug(dto.shortName || dto.name);

    const existing = await this.prisma.institution.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException({
        code: 'INSTITUTION_SLUG_EXISTS',
        message: 'An institution with a similar name or shortcode already exists.',
      });
    }

    return this.prisma.institution.create({
      data: {
        name: dto.name,
        slug,
        shortName: dto.shortName,
        description: dto.description,
        logoUrl: dto.logoUrl,
        coverImageUrl: dto.coverImageUrl,
        websiteUrl: dto.websiteUrl,
        country: dto.country,
        city: dto.city,
        email: dto.email,
        verificationMethod: dto.verificationMethod,
        allowedEmailDomains: dto.allowedEmailDomains || [],
      },
    });
  }

  async findAll(query: { page?: number; limit?: number; search?: string; status?: InstitutionStatus }) {
    const { skip, take, page, limit } = getPaginationSkipTake(query.page, query.limit);

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { shortName: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [institutions, total] = await Promise.all([
      this.prisma.institution.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              users: true,
              faculties: true,
              courses: true,
              organizations: true,
              groups: true,
            },
          },
        },
      }),
      this.prisma.institution.count({ where }),
    ]);

    return paginate(institutions, total, page, limit);
  }

  async findOne(idOrSlug: string) {
    const institution = await this.prisma.institution.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        faculties: {
          include: {
            departments: {
              include: {
                programmes: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
            courses: true,
            organizations: true,
            groups: true,
            events: true,
          },
        },
      },
    });

    if (!institution) {
      throw new NotFoundException({
        code: 'INSTITUTION_NOT_FOUND',
        message: 'Institution not found.',
      });
    }

    return institution;
  }

  async update(id: string, dto: UpdateInstitutionDto) {
    const institution = await this.prisma.institution.findUnique({
      where: { id },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found.');
    }

    return this.prisma.institution.update({
      where: { id },
      data: dto,
    });
  }

  async getStats(id: string) {
    const [
      studentsCount,
      coursesCount,
      groupsCount,
      eventsCount,
      postsCount,
    ] = await Promise.all([
      this.prisma.user.count({ where: { institutionId: id } }),
      this.prisma.course.count({ where: { institutionId: id } }),
      this.prisma.group.count({ where: { institutionId: id } }),
      this.prisma.event.count({ where: { institutionId: id } }),
      this.prisma.post.count({ where: { institutionId: id } }),
    ]);

    return {
      studentsCount,
      coursesCount,
      groupsCount,
      eventsCount,
      postsCount,
    };
  }
}
