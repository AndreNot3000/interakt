import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  IsBoolean,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  // Academic linkages
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facultyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  programmeId?: string;

  @ApiPropertyOptional({ example: 300 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(900)
  level?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  admissionNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  matricNo?: string;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @IsInt()
  graduationYear?: number;

  // Privacy settings
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showPhone?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showDOB?: boolean;
}
