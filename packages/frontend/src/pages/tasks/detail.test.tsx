import { describe, expect, it } from 'bun:test';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { SWRConfig } from 'swr';
import { createTestNetwork } from '../../../test-setup';
import { createTaskResponseMock } from '../../api/tasks.fixtures';
import {
  deleteTaskMockHandler,
  getTaskMockHandler,
  getTasksMockHandlers,
} from '../../api/tasks.msw';
import { TaskDetail } from './detail';

const taskDescription = 'Draft the proposal for the new project.';
const task = createTaskResponseMock({
  description: taskDescription,
  status: 'IN_PROGRESS',
});
const network = createTestNetwork(
  getTasksMockHandlers({
    task: { status: 200, body: task },
    list: { status: 200, body: [] },
  }),
);

describe('TaskDetail', () => {
  it('shows task details and links to edit the task', async () => {
    render(
      <SWRConfig
        value={{
          provider: () => new Map(),
          dedupingInterval: 0,
          revalidateOnFocus: false,
          shouldRetryOnError: false,
        }}
      >
        <MemoryRouter initialEntries={['/tasks/task-1']}>
          <TaskDetail taskId="task-1" />
        </MemoryRouter>
      </SWRConfig>,
    );

    expect(
      await screen.findByRole('heading', { name: task.title }),
    ).toBeTruthy();
    expect(screen.getByText(taskDescription)).toBeTruthy();
    expect(screen.getByText('In Progress')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Edit task' }).getAttribute('href'),
    ).toBe('/tasks/task-1/edit');
  });

  it('shows a fallback when the task has no description', async () => {
    network.use(
      getTaskMockHandler(({ params }) => ({
        status: 200,
        body: createTaskResponseMock({
          ...task,
          id: params.id,
          description: null,
        }),
      })),
    );

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
          <TaskDetail taskId="task-1" />
        </MemoryRouter>
      </SWRConfig>,
    );

    expect(
      await screen.findByText('No description has been added.'),
    ).toBeTruthy();
  });

  it('shows an API error', async () => {
    network.use(
      getTaskMockHandler({
        status: 500,
        body: { error: 'Unable to load task.' },
      }),
    );
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
          <TaskDetail taskId="task-1" />
        </MemoryRouter>
      </SWRConfig>,
    );
    expect(await screen.findByText('Unable to load task.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('shows the API error when the task does not exist', async () => {
    network.use(
      getTaskMockHandler({
        status: 404,
        body: { error: 'Task not found' },
      }),
    );
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
          <TaskDetail taskId="task-1" />
        </MemoryRouter>
      </SWRConfig>,
    );
    expect(await screen.findByText('Task not found')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('deletes after confirmation and navigates to the task list', async () => {
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
        <MemoryRouter initialEntries={['/tasks/task-1']}>
          <Routes>
            <Route
              path="/tasks/:taskId"
              element={<TaskDetail taskId="task-1" />}
            />
            <Route
              path="/"
              element={<output data-testid="current-path">/</output>}
            />
          </Routes>
        </MemoryRouter>
      </SWRConfig>,
    );

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('alertdialog')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Delete task' }));

    await waitFor(() => {
      expect(screen.getByTestId('current-path').textContent).toBe('/');
    });
  });

  it('keeps the task and reports a delete error', async () => {
    const user = userEvent.setup();
    network.use(
      deleteTaskMockHandler({
        status: 500,
        body: { error: 'Unable to delete task.' },
      }),
    );

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
          <TaskDetail taskId="task-1" />
        </MemoryRouter>
      </SWRConfig>,
    );

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('alertdialog')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Delete task' }));

    expect(await screen.findByText('Unable to delete task.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: task.title })).toBeTruthy();
  });
});
