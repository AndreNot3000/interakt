import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class AppValidationPipe implements PipeTransform<unknown> {
  async transform(value: unknown, { metatype }: ArgumentMetadata): Promise<unknown> {
    if (!metatype || !this.shouldValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object as object, {
      whitelist: true,            // Strip undeclared properties
      forbidNonWhitelisted: true, // Throw on undeclared properties
    });

    if (errors.length > 0) {
      const details = errors.map((error) => ({
        field: error.property,
        constraints: Object.values(error.constraints ?? {}),
      }));

      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        errors: details,
      });
    }

    return object;
  }

  private shouldValidate(metatype: unknown): boolean {
    const primitiveTypes: unknown[] = [String, Boolean, Number, Array, Object];
    return !primitiveTypes.includes(metatype);
  }
}
