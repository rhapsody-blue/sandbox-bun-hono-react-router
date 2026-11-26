import { ArrowLeft, Check } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import useSWR, { useSWRConfig } from 'swr';
import useSWRMutation from 'swr/mutation';
import { ErrorMessage } from '@/components/error-message';
import { LoadingState } from '@/components/loading-state';
import { PageContent } from '@/components/page-content';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SidebarLayout } from '@/layout/sidebar-layout';
import { isRetryableError } from '@/lib/errors';
import type { Task, TaskInput, TaskUpdate } from '../../api/tasks';
import { createTask, fetchTask, updateTask } from '../../api/tasks';

type SaveTaskArg =
  | { kind: 'create'; task: TaskInput }
  | { kind: 'update'; id: string; task: TaskUpdate };

function TaskForm({ taskId }: { taskId?: string }) {
  const navigate = useNavigate();
  const { mutate } = useSWRConfig();
  const { trigger: saveTask, isMutating: saving } = useSWRMutation(
    taskId ? `/tasks/${taskId}` : '/tasks',
    (_key: string, { arg }: { arg: SaveTaskArg }) =>
      arg.kind === 'create'
        ? createTask(arg.task)
        : updateTask(arg.id, arg.task),
  );
  const {
    data: task,
    error: taskError,
    isLoading,
    isValidating,
    mutate: retryTask,
  } = useSWR(
    taskId ? `/tasks/${taskId}` : null,
    taskId ? () => fetchTask(taskId) : null,
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('TODO');
  const [errorMessage, setErrorMessage] = useState('');
  const [initializedTaskId, setInitializedTaskId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!task || initializedTaskId === task.id) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    setStatus(task.status);
    setInitializedTaskId(task.id);
  }, [task, initializedTaskId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please enter a task title.');
      return;
    }
    setErrorMessage('');
    try {
      const arg: SaveTaskArg = taskId
        ? {
            kind: 'update',
            id: taskId,
            task: { title: title.trim(), description, status },
          }
        : {
            kind: 'create',
            task: { title: title.trim(), description },
          };
      const savedTask = await saveTask(arg, {
        populateCache: arg.kind === 'update',
        revalidate: false,
      });
      await mutate<Task[]>(
        '/tasks',
        (currentTasks) => {
          if (arg.kind === 'create') {
            return [
              savedTask,
              ...(currentTasks?.filter((item) => item.id !== savedTask.id) ??
                []),
            ];
          }
          return currentTasks?.map((item) =>
            item.id === savedTask.id ? savedTask : item,
          );
        },
        { revalidate: false },
      );
      navigate('/');
    } catch (saveError) {
      setErrorMessage(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save this task.',
      );
    }
  }

  if (isLoading) {
    return (
      <SidebarLayout>
        <PageContent>
          <LoadingState>Loading task…</LoadingState>
        </PageContent>
      </SidebarLayout>
    );
  }
  if (taskError && !task) {
    return (
      <SidebarLayout>
        <PageContent>
          <ErrorMessage
            message={taskError.message}
            onRetry={
              isRetryableError(taskError) ? () => void retryTask() : undefined
            }
            retrying={isValidating}
          />
        </PageContent>
      </SidebarLayout>
    );
  }
  if (taskId && !task) {
    return (
      <SidebarLayout>
        <PageContent>
          <ErrorMessage message="Task not found." />
        </PageContent>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <PageContent narrow>
        <Link
          className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
          to={taskId ? `/tasks/${taskId}` : '/'}
        >
          <ArrowLeft size={16} /> {taskId ? 'Back to task' : 'Back to tasks'}
        </Link>
        {taskError && (
          <div className="mb-4">
            <ErrorMessage
              message={taskError.message}
              onRetry={
                isRetryableError(taskError) ? () => void retryTask() : undefined
              }
              retrying={isValidating}
            />
          </div>
        )}
        <div className="mb-5">
          <div className="mb-2 text-[10px] font-bold tracking-[1.25px] text-muted-foreground">
            TASK DETAILS
          </div>
          <h1 className="mb-1.5 font-heading text-[28px] font-bold tracking-tight text-foreground max-md:text-2xl">
            {taskId ? 'Edit task' : 'Create a task'}
          </h1>
          <p className="m-0 text-xs text-muted-foreground">
            {taskId
              ? 'Make changes to keep things up to date.'
              : 'Write it down, then make it happen.'}
          </p>
        </div>
        <Card className="gap-0 rounded-xl p-6 shadow-sm ring-1 ring-foreground/5 max-md:p-4">
          <form
            className="grid gap-5"
            onSubmit={(event) => void handleSubmit(event)}
          >
            {errorMessage && <ErrorMessage message={errorMessage} />}
            <div className="grid gap-2 text-xs font-semibold text-foreground/80">
              <label htmlFor="task-title">
                Task name <span className="text-rose-600">*</span>
              </label>
              <Input
                id="task-title"
                maxLength={200}
                placeholder="e.g. Prepare project proposal"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2 text-xs font-semibold text-foreground/80">
              <label htmlFor="task-description">
                Description{' '}
                <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                  Optional
                </span>
              </label>
              <Textarea
                id="task-description"
                className="min-h-28 resize-y text-sm"
                placeholder="Add a few details to help you get started..."
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            {taskId && (
              <div className="grid gap-2 text-xs font-semibold text-foreground/80">
                <span>Status</span>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger aria-label="Status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODO">To do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 border-t pt-4 text-[10px] text-muted-foreground max-sm:items-start max-sm:flex-col">
              <span>
                <span className="text-rose-600">*</span> Required field
              </span>
              <div className="flex items-center gap-2 self-end">
                <Button asChild variant="outline" className="h-9 text-xs">
                  <Link to={taskId ? `/tasks/${taskId}` : '/'}>Cancel</Link>
                </Button>
                <Button
                  className="h-9 gap-2 text-xs"
                  type="submit"
                  disabled={saving}
                >
                  <Check size={17} />{' '}
                  {saving ? 'Saving…' : taskId ? 'Save changes' : 'Create task'}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </PageContent>
    </SidebarLayout>
  );
}

export { TaskForm };
