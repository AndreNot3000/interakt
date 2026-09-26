import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'david@student.unilag.edu.ng' })
  @IsEmail()
  email!: string;
}
