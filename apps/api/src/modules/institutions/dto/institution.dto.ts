import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsEmail,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InstitutionStatus, VerificationMethod } from '@prisma/client';

export class CreateInstitutionDto {
  @ApiProperty({ example: 'University of Lagos' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'UNILAG' })
  @IsOptional()
  @IsString()
  shortName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: 'https://unilag.edu.ng' })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiProperty({ example: 'Nigeria' })
  @IsString()
  @IsNotEmpty()
  country!: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'info@unilag.edu.ng' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: VerificationMethod, default: VerificationMethod.ADMIN_APPROVAL })
  @IsOptional()
  @IsEnum(VerificationMethod)
  verificationMethod?: VerificationMethod;

  @ApiPropertyOptional({ example: ['student.unilag.edu.ng', 'unilag.edu.ng'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedEmailDomains?: string[];
}

export class UpdateInstitutionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: InstitutionStatus })
  @IsOptional()
  @IsEnum(InstitutionStatus)
  status?: InstitutionStatus;

  @ApiPropertyOptional({ enum: VerificationMethod })
  @IsOptional()
  @IsEnum(VerificationMethod)
  verificationMethod?: VerificationMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedEmailDomains?: string[];
}
