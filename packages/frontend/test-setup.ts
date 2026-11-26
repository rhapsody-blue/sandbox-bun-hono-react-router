import { afterAll, afterEach, beforeAll } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { FetchInterceptor } from '@mswjs/interceptors/fetch/web';
import { defineNetwork, InterceptorSource } from 'msw/experimental';

GlobalRegistrator.register();

const { cleanup } = await import('@testing-library/react');
afterEach(cleanup);

type NetworkOptions = Parameters<typeof defineNetwork>[0];

export function createTestNetwork(handlers: NetworkOptions['handlers']) {
  const network = defineNetwork({
    sources: [
      new InterceptorSource({
        interceptors: [
          // Bun needs the web interceptor to intercept its native fetch implementation.
          new FetchInterceptor(),
        ],
      }),
    ],
    handlers,
    onUnhandledFrame: 'error',
    context: { quiet: true },
  });

  beforeAll(() => network.enable());
  afterEach(() => network.resetHandlers());
  afterAll(() => network.disable());

  return network;
}
