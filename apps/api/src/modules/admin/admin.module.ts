import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, VerificationStatus, ReportStatus } from '@prisma/client';
import { paginate, getPaginationSkipTake } from '../../common/helpers/pagination.helper';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardMetrics(institutionId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalStudents,
      verifiedStudents,
      pendingVerifications,
      activeCourses,
      activeGroups,
      registeredOrgs,
      upcomingEvents,
      pendingReports,
      newRegistrationsToday,
    ] = await Promise.all([
      this.prisma.user.count({ where: { institutionId, role: UserRole.STUDENT } }),
      this.prisma.user.count({ where: { institutionId, verificationStatus: VerificationStatus.VERIFIED } }),
      this.prisma.verificationRequest.count({
        where: { user: { institutionId }, status: VerificationStatus.PENDING },
      }),
      this.prisma.course.count({ where: { institutionId } }),
      this.prisma.group.count({ where: { institutionId } }),
      this.prisma.organization.count({ where: { institutionId } }),
      this.prisma.event.count({ where: { institutionId, endDate: { gte: new Date() } } }),
      this.prisma.report.count({ where: { status: ReportStatus.PENDING } }),
      this.prisma.user.count({ where: { institutionId, createdAt: { gte: today } } }),
    ]);

    return {
      totalStudents,
      verifiedStudents,
      pendingVerifications,
      activeCourses,
      activeGroups,
      registeredOrgs,
      upcomingEvents,
      pendingReports,
      newRegistrationsToday,
    };
  }

  async getPendingVerifications(institutionId: string, page = 1, limit = 20) {
    const { skip, take } = getPaginationSkipTake(page, limit);

    const [requests, total] = await Promise.all([
      this.prisma.verificationRequest.findMany({
        where: { user: { institutionId }, status: VerificationStatus.PENDING },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              createdAt: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  studentId: true,
                  matricNo: true,
                  level: true,
                  faculty: { select: { name: true } },
                  department: { select: { name: true } },
                  programme: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.verificationRequest.count({
        where: { user: { institutionId }, status: VerificationStatus.PENDING },
      }),
    ]);

    return paginate(requests, total, page, limit);
  }

  async reviewVerification(
    institutionId: string,
    requestId: string,
    reviewerId: string,
    status: VerificationStatus,
    reviewNote?: string,
  ) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request || request.user.institutionId !== institutionId) {
      throw new NotFoundException('Verification request not found.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.verificationRequest.update({
        where: { id: requestId },
        data: {
          status,
          reviewedBy: reviewerId,
          reviewNote,
          updatedAt: new Date(),
        },
      });

      await tx.user.update({
        where: { id: request.userId },
        data: { verificationStatus: status },
      });

      // Send in-app notification to the student
      await tx.notification.create({
        data: {
          recipientId: request.userId,
          type: 'VERIFICATION_UPDATE',
          title: status === VerificationStatus.VERIFIED ? 'Campus Verification Approved! ✓' : 'Verification Update',
          body: status === VerificationStatus.VERIFIED
            ? 'Your student status has been verified. You now have full access to all campus features.'
            : `Your verification was not approved: ${reviewNote || 'Please check your submitted details and try again.'}`,
        },
      });

      return updatedRequest;
    });
  }

  async toggleUserSuspension(institutionId: string, targetUserId: string, isActive: boolean) {
    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, institutionId },
    });
    if (!user) throw new NotFoundException('User not found in your institution.');

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { isActive },
    });
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(UserRole.UNIVERSITY_ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'University administration dashboard overview metrics' })
  async getDashboard(@CurrentUser() user: JwtPayload) {
    return this.adminService.getDashboardMetrics(user.institutionId);
  }

  @Get('verifications')
  @ApiOperation({ summary: 'Queue of pending student university verifications' })
  async getVerifications(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getPendingVerifications(
      user.institutionId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Patch('verifications/:id/review')
  @ApiOperation({ summary: 'Approve or reject student university verification' })
  async reviewVerification(
    @CurrentUser() user: JwtPayload,
    @Param('id') requestId: string,
    @Body('status') status: VerificationStatus,
    @Body('reviewNote') reviewNote?: string,
  ) {
    return this.adminService.reviewVerification(
      user.institutionId,
      requestId,
      user.sub,
      status,
      reviewNote,
    );
  }

  @Patch('users/:id/suspension')
  @ApiOperation({ summary: 'Suspend or restore student platform access' })
  async toggleSuspension(
    @CurrentUser() user: JwtPayload,
    @Param('id') targetUserId: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.adminService.toggleUserSuspension(user.institutionId, targetUserId, isActive);
  }
}

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
