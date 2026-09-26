import { IsEmail, IsString, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class DeviceInfoDto {
  @IsOptional() @IsString() userAgent?: string;
  @IsOptional() @IsString() ipAddress?: string;
  @IsOptional() @IsString() deviceName?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'david@student.unilag.edu.ng' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({ example: 'clr1234567890' })
  @IsOptional()
  @IsString()
  institutionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  deviceInfo?: DeviceInfoDto;
}
