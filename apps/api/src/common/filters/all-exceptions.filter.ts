import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

interface ErrorBody {
  code: string;
  message: string;
  errors?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'object' && response !== null) {
        const resp = response as ErrorBody & Record<string, unknown>;
        message = typeof resp['message'] === 'string' ? resp['message'] : exception.message;
        details = resp['errors'] ?? undefined;
        code = typeof resp['code'] === 'string' ? resp['code'] : this.statusToCode(status);
      } else if (typeof response === 'string') {
        message = response;
        code = this.statusToCode(status);
      }
    } else if (exception instanceof Error) {
      // Log unexpected errors with stack trace
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    } else {
      this.logger.error('Unknown exception type', JSON.stringify(exception));
    }

    // Never expose internal server details in production
    if (status === HttpStatus.INTERNAL_SERVER_ERROR && process.env.NODE_ENV === 'production') {
      message = 'An unexpected error occurred. Please try again later.';
      details = undefined;
    }

    void reply.status(status).send({
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return map[status] ?? 'UNKNOWN_ERROR';
  }
}
