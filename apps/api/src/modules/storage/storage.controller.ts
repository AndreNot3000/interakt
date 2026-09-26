import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class GetUploadUrlDto {
  @IsString() @IsNotEmpty() folder!: string;
  @IsString() @IsNotEmpty() mimeType!: string;
  @IsOptional() @IsString() fileName?: string;
}

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload-url')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a presigned URL for direct client-to-S3 upload' })
  async getUploadUrl(@Body() dto: GetUploadUrlDto) {
    const result = await this.storageService.getPresignedUploadUrl(
      dto.folder,
      dto.mimeType,
      3600,
      dto.fileName,
    );
    return {
      success: true,
      data: {
        ...result,
        publicUrl: this.storageService.getPublicUrl(result.key),
      },
      message: 'Upload URL generated.',
    };
  }
}
