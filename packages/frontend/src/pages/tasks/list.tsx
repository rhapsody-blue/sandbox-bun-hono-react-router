import { ListTodo, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { ErrorMessage } from '@/components/error-message';
import { LoadingState } from '@/components/loading-state';
import { PageContent } from '@/components/page-content';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SidebarLayout } from '@/layout/sidebar-layout';
import { isRetryableError } from '@/lib/errors';
import { StatusBadge } from '@/pages/tasks/components/status-badge';
import { deleteTask, fetchTasks, type Task } from '../../api/tasks';

function TaskList() {
  const {
    data: tasks,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR('/tasks', fetchTasks);
  const { trigger: triggerDelete, isMutating: isDeleting } = useSWRMutation(
    '/tasks',
    (_key, { arg }: { arg: string }) => deleteTask(arg),
  );
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleteError, setDeleteError] = useState('');

  async function handleDelete(task: Task) {
    try {
      await triggerDelete(task.id, { revalidate: false });
      await mutate(
        (current) => current?.filter((item) => item.id !== task.id),
        {
          revalidate: false,
        },
      );
    } catch (caughtError) {
      setDeleteError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to delete this task.',
      );
    }
  }

  return (
    <SidebarLayout>
      <PageContent>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="mb-1 font-heading text-2xl font-bold text-foreground">
              Tasks
            </h1>
            <p className="m-0 text-sm text-muted-foreground">
              Create and manage your tasks.
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link to="/tasks/new">
              <Plus size={17} />
              New task
            </Link>
          </Button>
        </div>

        {deleteError && (
          <div className="mb-4">
            <ErrorMessage message={deleteError} />
          </div>
        )}

        <Card className="gap-0 rounded-lg p-0 shadow-sm ring-1 ring-foreground/5">
          {error && !tasks ? (
            <div className="p-4">
              <ErrorMessage
                message={error.message}
                onRetry={
                  isRetryableError(error) ? () => void mutate() : undefined
                }
                retrying={isValidating}
              />
            </div>
          ) : isLoading ? (
            <LoadingState>Loading tasks…</LoadingState>
          ) : (
            <>
              {error && (
                <div className="p-4 pb-0">
                  <ErrorMessage
                    message={error.message}
                    onRetry={
                      isRetryableError(error) ? () => void mutate() : undefined
                    }
                    retrying={isValidating}
                  />
                </div>
              )}
              {tasks?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="pl-5">Task</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-4 text-right">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="max-w-0 pl-5">
                          <Link className="grid gap-1" to={`/tasks/${task.id}`}>
                            <strong className="truncate font-medium text-foreground hover:text-primary">
                              {task.title}
                            </strong>
                            {task.description && (
                              <span className="truncate text-xs text-muted-foreground">
                                {task.description}
                              </span>
                            )}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={task.status} />
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <Button
                            aria-label={`Delete ${task.title}`}
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => {
                              setDeleteError('');
                              setTaskToDelete(task);
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
                  <ListTodo className="mb-3 size-8 text-muted-foreground" />
                  <h2 className="mb-1 text-base font-semibold">No tasks yet</h2>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Create a task to get started.
                  </p>
                  <Button asChild variant="outline">
                    <Link to="/tasks/new">Create task</Link>
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
        <AlertDialog
          open={taskToDelete !== null}
          onOpenChange={(open) => {
            if (!open) setTaskToDelete(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete task?</AlertDialogTitle>
              <AlertDialogDescription>
                {taskToDelete
                  ? `Delete "${taskToDelete.title}"? This action cannot be undone.`
                  : 'This action cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={isDeleting}
                onClick={() => {
                  if (taskToDelete) void handleDelete(taskToDelete);
                }}
              >
                Delete task
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContent>
    </SidebarLayout>
  );
}

export { TaskList };
