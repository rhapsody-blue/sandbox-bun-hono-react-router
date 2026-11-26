import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { Prisma } from '../../../node_modules/.prisma/client';
import { logger } from '../../lib/logger';

const issuer = 'https://issuer.example.test/realms/task-app';
const audience = 'task-api';
let denyAuthorization = false;
const authorizationCalls: Array<{
  subject: string;
  resource: { type: 'task'; ownerId?: string };
  action: string;
}> = [];
const { privateKey, publicKey } = await generateKeyPair('RS256');
const publicJwk = await exportJWK(publicKey);
publicJwk.kid = 'test-key';
publicJwk.alg = 'RS256';
publicJwk.use = 'sig';

const jwksServer = Bun.serve({
  port: 0,
  fetch: () => Response.json({ keys: [publicJwk] }),
});

process.env.KEYCLOAK_ISSUER = issuer;
process.env.KEYCLOAK_AUDIENCE = audience;
process.env.KEYCLOAK_JWKS_URL = `http://127.0.0.1:${jwksServer.port}/jwks`;

mock.module('../../lib/prisma', () => ({
  prisma: {
    task: {
      findMany: () => Promise.resolve([]),
      findFirst: () => Promise.resolve(null),
      create: () => Promise.resolve(null),
      update: () => Promise.resolve(null),
      delete: () => Promise.resolve(null),
    },
  },
}));

mock.module('../../authz/authorization', () => ({
  canAccess: async (
    subject: string,
    resource: { type: 'task'; ownerId?: string },
    action: string,
  ) => {
    authorizationCalls.push({ subject, resource, action });
    return !denyAuthorization && resource.ownerId === subject;
  },
}));

const { app } = await import('../../index');
const { prisma } = await import('../../lib/prisma');

async function tokenFor(subject = 'user-1', tokenAudience = audience) {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer(issuer)
    .setAudience(tokenAudience)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
}

async function request(
  path: string,
  init: RequestInit = {},
  subject = 'user-1',
) {
  const headers = new Headers(init.headers);
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${await tokenFor(subject)}`);
  }
  return app.request(path, { ...init, headers });
}

afterAll(() => {
  jwksServer.stop(true);
});

type TaskSpy = ReturnType<
  typeof spyOn<typeof prisma.task, keyof typeof prisma.task>
>;

const mockTask = {
  id: 'task-1',
  ownerId: 'user-1',
  title: 'Test Task',
  description: 'A test task',
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

const serializedMockTask = {
  id: 'task-1',
  title: 'Test Task',
  description: 'A test task',
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

let findFirstSpy: TaskSpy;
let findManySpy: TaskSpy;
let createSpy: TaskSpy;
let updateSpy: TaskSpy;
let deleteSpy: TaskSpy;

function recordNotFoundError() {
  return new Prisma.PrismaClientKnownRequestError('Record not found', {
    code: 'P2025',
    clientVersion: 'test',
  });
}

beforeEach(() => {
  denyAuthorization = false;
  authorizationCalls.length = 0;
  findManySpy = spyOn(prisma.task, 'findMany').mockResolvedValue([
    mockTask,
  ] as never);
  findFirstSpy = spyOn(prisma.task, 'findFirst').mockResolvedValue(
    mockTask as never,
  );
  createSpy = spyOn(prisma.task, 'create').mockResolvedValue(mockTask as never);
  updateSpy = spyOn(prisma.task, 'update').mockResolvedValue(mockTask as never);
  deleteSpy = spyOn(prisma.task, 'delete').mockResolvedValue(mockTask as never);
});

afterEach(() => {
  mock.restore();
});

describe('GET /api/tasks', () => {
  it('returns 200 with a list of tasks', async () => {
    const res = await request('/api/tasks');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([serializedMockTask]);
    expect(findManySpy).toHaveBeenCalledWith({
      where: { ownerId: 'user-1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(authorizationCalls).toContainEqual({
      subject: 'user-1',
      resource: { type: 'task', ownerId: 'user-1' },
      action: 'list',
    });
  });

  it('returns a generic 500 response without exposing exception details', async () => {
    const databaseError = new Error('Sensitive database details');
    spyOn(prisma.task, 'findMany').mockRejectedValueOnce(
      databaseError as never,
    );
    const childLogger = spyOn(logger, 'child');

    const res = await request('/api/tasks');

    expect(res.status).toBe(500);
    const requestId = res.headers.get('X-Request-ID');
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    const responseBody = await res.text();
    expect(JSON.parse(responseBody)).toEqual({
      error: 'Internal Server Error',
    });
    expect(childLogger).toHaveBeenCalledWith({ requestId });
    expect(responseBody).not.toContain('Sensitive database details');
  });

  describe('Task authorization', () => {
    it('rejects requests without a bearer token', async () => {
      const res = await app.request('/api/tasks');

      expect(res.status).toBe(401);
    });

    it('rejects malformed bearer tokens', async () => {
      const res = await app.request('/api/tasks', {
        headers: { Authorization: 'Bearer not-a-jwt' },
      });

      expect(res.status).toBe(401);
    });

    it('rejects tokens issued for a different audience', async () => {
      const token = await tokenFor('user-1', 'other-api');
      const res = await app.request('/api/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(401);
    });

    it('rejects users without an applicable Casbin policy', async () => {
      denyAuthorization = true;
      const res = await request('/api/tasks');

      expect(res.status).toBe(403);
    });

    it("does not return another user's task", async () => {
      findFirstSpy.mockResolvedValueOnce(null as never);

      const res = await request('/api/tasks/task-1', {}, 'user-2');

      expect(res.status).toBe(404);
      expect(findFirstSpy).toHaveBeenCalledWith({ where: { id: 'task-1' } });
    });
  });

  it('returns a UUID request ID and exposes it to browser clients', async () => {
    const childLogger = spyOn(logger, 'child');
    const res = await request('/api/tasks?secret=value', {
      headers: { Origin: 'http://localhost:5173' },
    });

    expect(res.status).toBe(200);
    const requestId = res.headers.get('X-Request-ID');
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(res.headers.get('Access-Control-Expose-Headers')).toContain(
      'X-Request-ID',
    );
    expect(childLogger).toHaveBeenCalledWith({ requestId });
  });
});

describe('Not found routes', () => {
  it('returns a JSON 404 response', async () => {
    const res = await app.request('/api/missing');

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not Found' });
  });

  it('does not expose the removed JSON OpenAPI endpoint', async () => {
    const res = await app.request('/api/openapi.json');

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not Found' });
  });

  it('does not serve the OpenAPI YAML from the backend', async () => {
    const res = await app.request('/api/openapi.yaml');

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not Found' });
  });

  it('does not serve Swagger UI from the backend', async () => {
    const res = await app.request('/api/docs');

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not Found' });
  });
});

describe('GET /api/tasks/:id', () => {
  it('returns 200 with the task when found', async () => {
    const res = await request('/api/tasks/task-1');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(serializedMockTask);
  });

  it('returns 404 when task is not found', async () => {
    findFirstSpy.mockResolvedValueOnce(null as never);
    const res = await request('/api/tasks/nonexistent');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: 'Task not found' });
  });
});

describe('POST /api/tasks', () => {
  it('returns 201 with the created task', async () => {
    const res = await request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Task', description: 'A test task' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual(serializedMockTask);
    expect(authorizationCalls).toContainEqual({
      subject: 'user-1',
      resource: { type: 'task', ownerId: 'user-1' },
      action: 'create',
    });
    expect(createSpy).toHaveBeenCalledWith({
      data: {
        ownerId: 'user-1',
        title: 'Test Task',
        description: 'A test task',
      },
    });
  });

  it('returns 400 when title is missing', async () => {
    const res = await request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'No title' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/tasks/:id', () => {
  it('returns 200 with the updated task', async () => {
    const res = await request('/api/tasks/task-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Task' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(serializedMockTask);
    expect(authorizationCalls).toContainEqual({
      subject: 'user-1',
      resource: { type: 'task', ownerId: 'user-1' },
      action: 'update',
    });
    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: 'task-1', ownerId: 'user-1' },
      data: { title: 'Updated Task' },
    });
  });

  it('returns 404 when task is not found', async () => {
    updateSpy.mockRejectedValueOnce(recordNotFoundError());
    const res = await request('/api/tasks/nonexistent', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Task' }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: 'Task not found' });
  });

  it('returns 500 for unexpected database errors', async () => {
    updateSpy.mockRejectedValueOnce(new Error('Database unavailable'));

    const res = await request('/api/tasks/task-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Task' }),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal Server Error' });
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('returns 204 when task is deleted', async () => {
    const res = await request('/api/tasks/task-1', {
      method: 'DELETE',
    });
    expect(res.status).toBe(204);
    expect(authorizationCalls).toContainEqual({
      subject: 'user-1',
      resource: { type: 'task', ownerId: 'user-1' },
      action: 'delete',
    });
    expect(deleteSpy).toHaveBeenCalledWith({
      where: { id: 'task-1', ownerId: 'user-1' },
    });
  });

  it('returns 404 when task is not found', async () => {
    deleteSpy.mockRejectedValueOnce(recordNotFoundError());
    const res = await request('/api/tasks/nonexistent', {
      method: 'DELETE',
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: 'Task not found' });
  });
});
