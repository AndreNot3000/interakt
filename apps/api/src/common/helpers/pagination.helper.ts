import { PaginatedResult } from '../interfaces/paginated.interface';

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export function getPaginationSkipTake(
  page = 1,
  limit = 20,
): { skip: number; take: number; page: number; limit: number } {
  const normalizedPage = Math.max(1, page);
  const normalizedLimit = Math.min(100, Math.max(1, limit));
  return {
    skip: (normalizedPage - 1) * normalizedLimit,
    take: normalizedLimit,
    page: normalizedPage,
    limit: normalizedLimit,
  };
}
