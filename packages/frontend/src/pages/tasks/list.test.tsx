import { beforeEach, describe, expect, it } from 'bun:test';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { SWRConfig } from 'swr';
import { createTestNetwork } from '../../../test-setup';
import { createTaskResponseMock } from '../../api/tasks.fixtures';
import {
  deleteTaskMockHandler,
  getTasksMockHandler,
  getTasksMockHandlers,
} from '../../api/tasks.msw';
import { TaskList } from './list';

const firstTaskDescription = 'Draft the proposal for the new project.';
const firstTask = createTaskResponseMock({
  description: firstTaskDescription,
});
const secondTask = createTaskResponseMock({
  id: 'task-2',
  title: 'Review design notes',
  description: 'Share feedback with the team.',
  status: 'IN_PROGRESS',
});
const tasks = [firstTask, secondTask];

let deleteRequests: string[] = [];

const network = createTestNetwork(
  getTasksMockHandlers({
    list: { status: 200, body: tasks },
    onDelete: (id) => {
      deleteRequests.push(id);
    },
  }),
);

beforeEach(() => {
  deleteRequests = [];
});

describe('TaskList', () => {
  it('shows task titles, descriptions, statuses, and navigation links', async () => {
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
          <TaskList />
        </MemoryRouter>
      </SWRConfig>,
    );

    expect(await screen.findByText(firstTask.title)).toBeTruthy();
    expect(screen.getByText(firstTaskDescription)).toBeTruthy();
    expect(screen.getByText(secondTask.title)).toBeTruthy();
    expect(screen.getByText('Todo')).toBeTruthy();
    expect(screen.getByText('In Progress')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'New task' }).getAttribute('href'),
    ).toBe('/tasks/new');
    expect(
      screen
        .getByRole('link', { name: /Prepare project proposal/ })
        .getAttribute('href'),
    ).toBe('/tasks/task-1');
  });

  it('shows an API error', async () => {
    network.use(
      getTasksMockHandler({
        status: 500,
        body: { error: 'Unable to load tasks.' },
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
          <TaskList />
        </MemoryRouter>
      </SWRConfig>,
    );
    expect(await screen.findByText('Unable to load tasks.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('retries a failed request and keeps stale tasks visible', async () => {
    let requestCount = 0;
    network.use(
      getTasksMockHandler(() => {
        requestCount += 1;
        return requestCount === 1
          ? { status: 500, body: { error: 'Unable to refresh tasks.' } }
          : { status: 200, body: tasks };
      }),
    );
    const user = userEvent.setup();

    render(
      <SWRConfig
        value={{
          provider: () => new Map(),
          fallback: { '/tasks': [firstTask] },
          dedupingInterval: 0,
          revalidateOnFocus: false,
          shouldRetryOnError: false,
        }}
      >
        <MemoryRouter initialEntries={['/']}>
          <TaskList />
        </MemoryRouter>
      </SWRConfig>,
    );

    expect(await screen.findByText('Unable to refresh tasks.')).toBeTruthy();
    expect(screen.getByText(firstTask.title)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText(secondTask.title)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(requestCount).toBe(2);
  });

  it('shows an empty state when there are no tasks', async () => {
    network.use(getTasksMockHandler({ status: 200, body: [] }));
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
          <TaskList />
        </MemoryRouter>
      </SWRConfig>,
    );
    expect(await screen.findByText('No tasks yet')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Create task' }).getAttribute('href'),
    ).toBe('/tasks/new');
  });

  it('deletes a task after confirmation and removes it from the list', async () => {
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
          <TaskList />
        </MemoryRouter>
      </SWRConfig>,
    );

    await user.click(
      await screen.findByRole('button', { name: `Delete ${firstTask.title}` }),
    );
    expect(await screen.findByRole('alertdialog')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Delete task' }));

    expect(await screen.findByText(secondTask.title)).toBeTruthy();
    expect(screen.queryByText(firstTask.title)).toBeNull();
    expect(deleteRequests).toEqual(['task-1']);
  });

  it('cancels deletion and reports delete errors', async () => {
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
          <TaskList />
        </MemoryRouter>
      </SWRConfig>,
    );

    await user.click(
      await screen.findByRole('button', { name: `Delete ${firstTask.title}` }),
    );
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });
    expect(deleteRequests).toHaveLength(0);

    network.use(
      deleteTaskMockHandler(
        {
          status: 500,
          body: { error: 'Unable to delete task.' },
        },
        (id) => {
          deleteRequests.push(id);
        },
      ),
    );
    await user.click(
      screen.getByRole('button', { name: `Delete ${firstTask.title}` }),
    );
    await user.click(screen.getByRole('button', { name: 'Delete task' }));

    expect(await screen.findByText('Unable to delete task.')).toBeTruthy();
    expect(deleteRequests).toEqual(['task-1']);
  });
});
