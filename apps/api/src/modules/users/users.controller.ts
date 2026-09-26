import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SubmitVerificationDto } from './dto/verification-request.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(['profile/me', 'profile'])
  @ApiOperation({ summary: 'Get current user profile with academic details' })
  async getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.getProfile(user.sub);
  }

  @Patch('profile/me')
  @ApiOperation({ summary: 'Update current student profile' })
  async updateMyProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Submit student identity verification request' })
  async submitVerification(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitVerificationDto,
  ) {
    return this.usersService.submitVerification(user.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'View public student profile' })
  async getUserProfile(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }

  @Get()
  @ApiOperation({ summary: 'List and search campus students' })
  async listStudents(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('facultyId') facultyId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('programmeId') programmeId?: string,
    @Query('level') level?: number,
    @Query('search') search?: string,
  ) {
    return this.usersService.listStudents(user.institutionId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      facultyId,
      departmentId,
      programmeId,
      level: level ? Number(level) : undefined,
      search,
    });
  }

  @Post(':id/block')
  @ApiOperation({ summary: 'Block a student' })
  async blockUser(@CurrentUser() user: JwtPayload, @Param('id') targetId: string) {
    return this.usersService.blockUser(user.sub, targetId);
  }

  @Delete(':id/block')
  @ApiOperation({ summary: 'Unblock a student' })
  async unblockUser(@CurrentUser() user: JwtPayload, @Param('id') targetId: string) {
    return this.usersService.unblockUser(user.sub, targetId);
  }
}
