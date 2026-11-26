import { describe, expect, it } from 'bun:test';
import { ApiError, isRetryableError } from './errors';

describe('isRetryableError', () => {
  it('retries network errors and server errors only', () => {
    expect(isRetryableError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isRetryableError(new ApiError('Server error', 500))).toBe(true);
    expect(isRetryableError(new ApiError('Not found', 404))).toBe(false);
    expect(isRetryableError(new Error('Unexpected error'))).toBe(false);
  });
});
