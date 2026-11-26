import { ApiError } from '../lib/errors';
import { getAccessToken } from '../lib/keycloak';

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskInput = {
  title: string;
  description?: string;
};

export type TaskUpdate = {
  title?: string;
  description?: string | null;
  status?: string;
};

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = await getAccessToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body: { error?: string } = await response.json();
      message = body.error ?? message;
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const fetchTasks = () => request<Task[]>('/tasks');
export const fetchTask = (id: string) =>
  request<Task>(`/tasks/${encodeURIComponent(id)}`);

export const createTask = (task: TaskInput) =>
  request<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  });

export const updateTask = (id: string, task: TaskUpdate) =>
  request<Task>(`/tasks/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(task),
  });

export const deleteTask = (id: string) =>
  request<void>(`/tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
