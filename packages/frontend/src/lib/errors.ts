export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isRetryableError(error: unknown) {
  return error instanceof ApiError
    ? error.status >= 500
    : error instanceof TypeError;
}
