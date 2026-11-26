import pino from 'pino';

const sensitiveFields = [
  'password',
  'token',
  'secret',
  'authorization',
  'Authorization',
  'cookie',
  'set-cookie',
  'apiKey',
  'api_key',
  'x-api-key',
  'clientSecret',
  'client_secret',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'idToken',
  'id_token',
];

const redactionPaths = sensitiveFields.flatMap((field) =>
  Array.from({ length: 6 }, (_, depth) => `${'*.'.repeat(depth)}${field}`),
);

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'backend',
  },
  redact: {
    paths: redactionPaths,
    censor: '[REDACTED]',
  },
});
