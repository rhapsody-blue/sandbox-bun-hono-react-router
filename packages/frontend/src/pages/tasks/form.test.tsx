import { beforeEach, describe, expect, it } from 'bun:test';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import useSWR, { SWRConfig } from 'swr';
import { createTestNetwork } from '../../../test-setup';
import type { TaskInput, TaskUpdate } from '../../api/tasks';
import { fetchTasks } from '../../api/tasks';
import { createTaskResponseMock } from '../../api/tasks.fixtures';
import {
  createTaskMockHandler,
  getTaskMockHandler,
  getTasksMockHandlers,
} from '../../api/tasks.msw';
import { TaskForm } from './form';

type TaskRequest =
  | { method: 'POST'; body: TaskInput }
  | { method: 'PUT'; body: TaskUpdate };

const task = createTaskResponseMock({ status: 'IN_PROGRESS' });
let requests: TaskRequest[] = [];

function TaskCacheViewer() {
  const { data: tasks } = useSWR('/tasks', fetchTasks);
  return (
    <output data-testid="cached-tasks">
      {tasks?.map((item) => item.title).join(', ')}
    </output>
  );
}

const network = createTestNetwork(
  getTasksMockHandlers({
    task: { status: 200, body: task },
    list: { status: 200, body: [] },
    onCreate: (body) => {
      requests.push({ method: 'POST', body });
    },
    onUpdate: (body) => {
      requests.push({ method: 'PUT', body });
    },
  }),
);

beforeEach(() => {
  requests = [];
});

describe('TaskForm', () => {
  it('creates a task with a trimmed title and description', async () => {
    const user = userEvent.setup();
    render(
      <SWRConfig
        value={{
          provider: () => new Map(),
          dedupingInterval: 0,
          revalidateOnMount: false,
          revalidateOnFocus: false,
          shouldRetryOnError: false,
        }}
      >
        <MemoryRouter initialEntries={['/tasks/new']}>
          <Routes>
            <Route path="/tasks/new" element={<TaskForm />} />
            <Route path="/" element={<TaskCacheViewer />} />
          </Routes>
        </MemoryRouter>
      </SWRConfig>,
    );

    await user.type(
      screen.getByLabelText(/Task name/),
      '  Write release notes  ',
    );
    await user.type(
      screen.getByLabelText(/Description/),
      'Summarize this release.',
    );
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    await waitFor(() => {
      expect(requests).toContainEqual({
        method: 'POST',
        body: {
          title: 'Write release notes',
          description: 'Summarize this release.',
        },
      });
    });
    expect((await screen.findByTestId('cached-tasks')).textContent).toBe(
      'Prepare project proposal',
    );
  });

  it('rejects a title containing only whitespace', async () => {
    const user = userEvent.setup();
    render(
      <SWRConfig
        value={{
          provider: () => new Map(),
          dedupingInterval: 0,
          revalidateOnFocus: false,
          shouldRetryOnError: false,
        }}
      >
        <MemoryRouter initialEntries={['/']}>
          <TaskForm />
        </MemoryRouter>
      </SWRConfig>,
    );

    await user.type(screen.getByLabelText(/Task name/), '   ');
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(await screen.findByText('Please enter a task title.')).toBeTruthy();
    expect(requests).toHaveLength(0);
  });

  it('loads and updates a task with the selected status', async () => {
    const user = userEvent.setup();
    render(
      <SWRConfig
        value={{
          provider: () => new Map(),
          dedupingInterval: 0,
          revalidateOnFocus: false,
          shouldRetryOnError: false,
        }}
      >
        <MemoryRouter initialEntries={['/tasks/task-1/edit']}>
          <Routes>
            <Route
              path="/tasks/task-1/edit"
              element={<TaskForm taskId="task-1" />}
            />
            <Route
              path="/"
              element={<output data-testid="current-path">/</output>}
            />
          </Routes>
        </MemoryRouter>
      </SWRConfig>,
    );

    expect(await screen.findByDisplayValue(task.title)).toBeTruthy();
    expect(screen.getByRole('combobox')).toBeTruthy();
    await user.clear(screen.getByLabelText(/Task name/));
    await user.type(screen.getByLabelText(/Task name/), 'Updated proposal');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(requests).toContainEqual({
        method: 'PUT',
        body: {
          title: 'Updated proposal',
          description: task.description,
          status: 'IN_PROGRESS',
        },
      });
    });
    expect(screen.getByTestId('current-path').textContent).toBe('/');
  });

  it('shows errors from loading and saving', async () => {
    network.use(
      getTaskMockHandler({
        status: 500,
        body: { error: 'Unable to load task.' },
      }),
      createTaskMockHandler(
        {
          status: 500,
          body: { error: 'Unable to create task.' },
        },
        (body) => {
          requests.push({ method: 'POST', body });
        },
      ),
    );
    const { rerender } = render(
      <SWRConfig
        value={{
          provider: () => new Map(),
          dedupingInterval: 0,
          revalidateOnFocus: false,
          shouldRetryOnError: false,
        }}
      >
        <MemoryRouter initialEntries={['/']}>
          <TaskForm taskId="task-1" />
        </MemoryRouter>
      </SWRConfig>,
    );
    expect(await screen.findByText('Unable to load task.')).toBeTruthy();

    rerender(
      <SWRConfig
        value={{
          provider: () => new Map(),
          dedupingInterval: 0,
          revalidateOnFocus: false,
          shouldRetryOnError: false,
        }}
      >
        <MemoryRouter initialEntries={['/']}>
          <TaskForm />
        </MemoryRouter>
      </SWRConfig>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Task name/), 'A new task');
    await user.click(screen.getByRole('button', { name: 'Create task' }));
    expect(await screen.findByText('Unable to create task.')).toBeTruthy();
  });
});
