import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { createRemoteJWKSet, errors, type JWTPayload, jwtVerify } from 'jose';
import type { RequestLoggerVariables } from './request-logger';

export type AuthenticatedUser = {
  id: string;
};

export type AuthEnv = {
  Variables: RequestLoggerVariables & {
    user: AuthenticatedUser;
  };
};

const issuer =
  process.env.KEYCLOAK_ISSUER ?? 'http://localhost:8080/realms/task-app';
const audience = process.env.KEYCLOAK_AUDIENCE ?? 'task-api';
const jwksUrl =
  process.env.KEYCLOAK_JWKS_URL ??
  'http://keycloak:8080/realms/task-app/protocol/openid-connect/certs';
const jwks = createRemoteJWKSet(new URL(jwksUrl));

export const authenticate = createMiddleware<AuthEnv>(async (c, next) => {
  const authorization = c.req.header('Authorization');
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) {
    throw new HTTPException(401, { message: 'Bearer access token required' });
  }

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, jwks, {
      issuer,
      audience,
      algorithms: ['RS256'],
    }));
  } catch (error) {
    if (
      error instanceof errors.JWTExpired ||
      error instanceof errors.JWTClaimValidationFailed ||
      error instanceof errors.JWSSignatureVerificationFailed ||
      error instanceof errors.JWTInvalid ||
      error instanceof errors.JWSInvalid ||
      error instanceof errors.JOSEAlgNotAllowed ||
      error instanceof errors.JWKSMultipleMatchingKeys ||
      error instanceof errors.JWKSNoMatchingKey
    ) {
      throw new HTTPException(401, {
        message: 'Invalid or expired access token',
      });
    }

    if (
      error instanceof errors.JWKSTimeout ||
      error instanceof errors.JWKSInvalid ||
      error instanceof TypeError
    ) {
      throw new HTTPException(503, {
        message: 'Identity provider is temporarily unavailable',
      });
    }

    throw error;
  }

  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new HTTPException(401, { message: 'Invalid access token subject' });
  }

  c.set('user', { id: payload.sub });

  await next();
});
