import { IsEnum, IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VerificationMethod } from '@prisma/client';

export class SubmitVerificationDto {
  @ApiProperty({ enum: VerificationMethod, example: VerificationMethod.STUDENT_ID })
  @IsEnum(VerificationMethod)
  method!: VerificationMethod;

  @ApiProperty({
    example: { studentId: '190408012', documentUrl: 'https://storage.../id-card.jpg' },
  })
  @IsNotEmpty()
  @IsObject()
  submittedData!: Record<string, unknown>;
}
