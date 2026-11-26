import type { Task } from './tasks';

export function createTaskResponseMock(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Prepare project proposal',
    description: 'Draft the proposal for the new project.',
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
