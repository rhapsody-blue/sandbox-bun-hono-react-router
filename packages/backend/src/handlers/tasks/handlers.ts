import { createFactory } from 'hono/factory';
import { validator } from 'hono-openapi';
import { Prisma } from '../../../node_modules/.prisma/client';
import { canAccess } from '../../authz/authorization';
import { prisma } from '../../lib/prisma';
import type { AuthEnv } from '../../middleware/auth';
import {
  CreateTaskSchema,
  TaskIdParamSchema,
  UpdateTaskSchema,
} from './schemas';

const factory = createFactory<AuthEnv>();

function isRecordNotFoundError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}

function serializeTask<
  T extends {
    ownerId: string;
    dueDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
>(task: T) {
  const { ownerId: _ownerId, ...publicTask } = task;
  return {
    ...publicTask,
    dueDate: task.dueDate?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export const list = factory.createHandlers(async (c) => {
  const { id: subject } = c.get('user');
  const canListAny = await canAccess(subject, { type: 'task' }, 'list');
  const canListOwned = await canAccess(
    subject,
    { type: 'task', ownerId: subject },
    'list',
  );

  if (!canListAny && !canListOwned) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const tasks = await prisma.task.findMany({
    ...(canListAny ? {} : { where: { ownerId: subject } }),
    orderBy: { createdAt: 'desc' },
  });
  const visibleTasks = [];
  for (const task of tasks) {
    if (
      await canAccess(subject, { type: 'task', ownerId: task.ownerId }, 'read')
    ) {
      visibleTasks.push(task);
    }
  }
  return c.json(visibleTasks.map(serializeTask), 200);
});

export const show = factory.createHandlers(
  validator('param', TaskIdParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { id: subject } = c.get('user');
    const task = await prisma.task.findFirst({
      where: { id },
    });
    if (
      !task ||
      !(await canAccess(
        subject,
        { type: 'task', ownerId: task.ownerId },
        'read',
      ))
    ) {
      return c.json({ error: 'Task not found' }, 404);
    }
    return c.json(serializeTask(task), 200);
  },
);

export const create = factory.createHandlers(
  validator('json', CreateTaskSchema),
  async (c) => {
    const body = c.req.valid('json');
    const { id: ownerId } = c.get('user');
    if (!(await canAccess(ownerId, { type: 'task', ownerId }, 'create'))) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const task = await prisma.task.create({
      data: {
        ownerId,
        title: body.title,
        description: body.description ?? null,
      },
    });
    return c.json(serializeTask(task), 201);
  },
);

export const update = factory.createHandlers(
  validator('param', TaskIdParamSchema),
  validator('json', UpdateTaskSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    const { id: subject } = c.get('user');
    const existingTask = await prisma.task.findFirst({ where: { id } });
    if (!existingTask) {
      return c.json({ error: 'Task not found' }, 404);
    }
    if (
      !(await canAccess(
        subject,
        { type: 'task', ownerId: existingTask.ownerId },
        'update',
      ))
    ) {
      return c.json({ error: 'Task not found' }, 404);
    }

    try {
      const task = await prisma.task.update({
        where: { id, ownerId: existingTask.ownerId },
        data: body,
      });
      return c.json(serializeTask(task), 200);
    } catch (error) {
      if (!isRecordNotFoundError(error)) {
        throw error;
      }
      return c.json({ error: 'Task not found' }, 404);
    }
  },
);

export const destroy = factory.createHandlers(
  validator('param', TaskIdParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { id: subject } = c.get('user');
    const task = await prisma.task.findFirst({ where: { id } });
    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }
    if (
      !(await canAccess(
        subject,
        { type: 'task', ownerId: task.ownerId },
        'delete',
      ))
    ) {
      return c.json({ error: 'Task not found' }, 404);
    }

    try {
      await prisma.task.delete({
        where: { id, ownerId: task.ownerId },
      });
      return c.body(null, 204);
    } catch (error) {
      if (!isRecordNotFoundError(error)) {
        throw error;
      }
      return c.json({ error: 'Task not found' }, 404);
    }
  },
);
