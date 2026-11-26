import { createMiddleware } from 'hono/factory';
import type { Logger } from 'pino';
import { logger } from '../lib/logger';

export type RequestLoggerVariables = {
  logger: Logger;
  requestId: string;
};

export type RequestLoggerEnv = {
  Variables: RequestLoggerVariables;
};

export const requestLogger = createMiddleware<RequestLoggerEnv>(
  async (c, next) => {
    const requestId = crypto.randomUUID();
    c.set('requestId', requestId);
    c.set('logger', logger.child({ requestId }));
    c.header('X-Request-ID', requestId);

    const start = performance.now();
    await next();

    c.get('logger').info(
      {
        method: c.req.method,
        path: new URL(c.req.url).pathname,
        status: c.res.status,
        responseTimeMs: Math.round((performance.now() - start) * 100) / 100,
      },
      'Request completed',
    );
  },
);
