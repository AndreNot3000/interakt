import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: true;
  data: T;
  message: string;
  meta?: Record<string, unknown>;
}

/**
 * Wraps all successful controller responses in a standard envelope:
 * { success: true, data: T, message: string }
 *
 * If a controller already returns the full envelope (e.g., custom paginated responses),
 * it's passed through unchanged.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((response) => {
        // Pass through if already in envelope format
        if (
          response &&
          typeof response === 'object' &&
          'success' in response &&
          (response as Record<string, unknown>)['success'] === true
        ) {
          return response as ApiResponse<T>;
        }

        return {
          success: true as const,
          data: response as T,
          message: 'Success',
        };
      }),
    );
  }
}
