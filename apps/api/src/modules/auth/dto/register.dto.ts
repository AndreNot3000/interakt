import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
  Matches,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class DeviceInfoDto {
  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'david@student.unilag.edu.ng' })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email!: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
  })
  password!: string;

  @ApiProperty({ example: 'David' })
  @IsString()
  @IsNotEmpty({ message: 'First name is required.' })
  @MaxLength(50)
  firstName!: string;

  @ApiProperty({ example: 'Adeyemi' })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required.' })
  @MaxLength(50)
  lastName!: string;

  @ApiPropertyOptional({ example: 'clr1234567890', description: 'The institution ID to register under' })
  @IsOptional()
  @IsString()
  institutionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  deviceInfo?: DeviceInfoDto;
}
