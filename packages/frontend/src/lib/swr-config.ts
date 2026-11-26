import type { SWRConfiguration } from 'swr';
import { isRetryableError } from './errors';

const swrConfig: SWRConfiguration = {
  onErrorRetry(error, _key, _config, revalidate, { retryCount }) {
    if (!isRetryableError(error) || retryCount >= 2) return;
    setTimeout(() => revalidate({ retryCount }), 1000 * 2 ** retryCount);
  },
};

export { swrConfig };
