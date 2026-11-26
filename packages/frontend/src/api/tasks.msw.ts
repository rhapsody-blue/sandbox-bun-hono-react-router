import type {
  HttpResponseResolver,
  PathParams,
  RequestHandlerOptions,
} from 'msw';
import { HttpResponse, http } from 'msw/http';
import type { Task, TaskInput, TaskUpdate } from './tasks';
import { createTaskResponseMock } from './tasks.fixtures';

export type TaskApiError = {
  error: string;
};

export type TaskApiResponse<
  Body,
  SuccessStatus extends number,
  ErrorStatus extends number,
> =
  | { status: SuccessStatus; body: Body }
  | { status: ErrorStatus; body: TaskApiError };

type ListTasksResponse = TaskApiResponse<Task[], 200, 500>;
type GetTaskResponse = TaskApiResponse<Task, 200, 404 | 500>;
type CreateTaskResponse = TaskApiResponse<Task, 201, 400 | 500>;
type UpdateTaskResponse = TaskApiResponse<Task, 200, 400 | 404 | 500>;
type DeleteTaskResponse =
  | { status: 204; body?: undefined }
  | { status: 404 | 500; body: TaskApiError };

type ListTasksInfo = Parameters<HttpResponseResolver<PathParams>>[0];
type GetTaskInfo = Parameters<HttpResponseResolver<{ id: string }>>[0];
type CreateTaskInfo = Parameters<
  HttpResponseResolver<PathParams, TaskInput>
>[0];
type UpdateTaskInfo = Parameters<
  HttpResponseResolver<{ id: string }, TaskUpdate>
>[0];
type DeleteTaskInfo = Parameters<HttpResponseResolver<{ id: string }>>[0];

type ResponseOverride<Info, Response> =
  | Response
  | ((info: Info) => Response | Promise<Response>);

export function getTasksMockHandler(
  response: ResponseOverride<ListTasksInfo, ListTasksResponse> = {
    status: 200,
    body: [createTaskResponseMock()],
  },
  options?: RequestHandlerOptions,
) {
  return http.get<PathParams>(
    '*/api/tasks',
    async (info) => {
      const resolvedResponse =
        typeof response === 'function' ? await response(info) : response;
      return HttpResponse.json(resolvedResponse.body, {
        status: resolvedResponse.status,
      });
    },
    options,
  );
}

export function getTaskMockHandler(
  response: ResponseOverride<GetTaskInfo, GetTaskResponse> = {
    status: 200,
    body: createTaskResponseMock(),
  },
  options?: RequestHandlerOptions,
) {
  return http.get<{ id: string }>(
    '*/api/tasks/:id',
    async (info) => {
      const resolvedResponse =
        typeof response === 'function' ? await response(info) : response;
      return HttpResponse.json(resolvedResponse.body, {
        status: resolvedResponse.status,
      });
    },
    options,
  );
}

export function createTaskMockHandler(
  response: ResponseOverride<CreateTaskInfo, CreateTaskResponse> = {
    status: 201,
    body: createTaskResponseMock(),
  },
  onRequest?: (body: TaskInput) => void | Promise<void>,
  options?: RequestHandlerOptions,
) {
  return http.post<PathParams, TaskInput>(
    '*/api/tasks',
    async (info) => {
      await onRequest?.(await info.request.json());
      const resolvedResponse =
        typeof response === 'function' ? await response(info) : response;
      return HttpResponse.json(resolvedResponse.body, {
        status: resolvedResponse.status,
      });
    },
    options,
  );
}

export function updateTaskMockHandler(
  response: ResponseOverride<UpdateTaskInfo, UpdateTaskResponse> = {
    status: 200,
    body: createTaskResponseMock(),
  },
  onRequest?: (body: TaskUpdate) => void | Promise<void>,
  options?: RequestHandlerOptions,
) {
  return http.put<{ id: string }, TaskUpdate>(
    '*/api/tasks/:id',
    async (info) => {
      await onRequest?.(await info.request.json());
      const resolvedResponse =
        typeof response === 'function' ? await response(info) : response;
      return HttpResponse.json(resolvedResponse.body, {
        status: resolvedResponse.status,
      });
    },
    options,
  );
}

export function deleteTaskMockHandler(
  response: ResponseOverride<DeleteTaskInfo, DeleteTaskResponse> = {
    status: 204,
  },
  onRequest?: (id: string) => void | Promise<void>,
  options?: RequestHandlerOptions,
) {
  return http.delete<{ id: string }>(
    '*/api/tasks/:id',
    async (info) => {
      await onRequest?.(info.params.id);
      const resolvedResponse =
        typeof response === 'function' ? await response(info) : response;
      if (resolvedResponse.status === 204) {
        return new HttpResponse(null, { status: resolvedResponse.status });
      }
      return HttpResponse.json(resolvedResponse.body, {
        status: resolvedResponse.status,
      });
    },
    options,
  );
}

export function getTasksMockHandlers({
  list,
  task,
  create,
  update,
  delete: deleteResponse,
  onCreate,
  onUpdate,
  onDelete,
}: {
  list?: ResponseOverride<ListTasksInfo, ListTasksResponse>;
  task?: ResponseOverride<GetTaskInfo, GetTaskResponse>;
  create?: ResponseOverride<CreateTaskInfo, CreateTaskResponse>;
  update?: ResponseOverride<UpdateTaskInfo, UpdateTaskResponse>;
  delete?: ResponseOverride<DeleteTaskInfo, DeleteTaskResponse>;
  onCreate?: (body: TaskInput) => void | Promise<void>;
  onUpdate?: (body: TaskUpdate) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
} = {}) {
  return [
    getTasksMockHandler(list),
    getTaskMockHandler(task),
    createTaskMockHandler(create, onCreate),
    updateTaskMockHandler(update, onUpdate),
    deleteTaskMockHandler(deleteResponse, onDelete),
  ];
}
