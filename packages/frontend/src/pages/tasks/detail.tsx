import { ArrowLeft, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import useSWR, { useSWRConfig } from 'swr';
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
import { SidebarLayout } from '@/layout/sidebar-layout';
import { isRetryableError } from '@/lib/errors';
import { StatusBadge } from '@/pages/tasks/components/status-badge';
import { deleteTask, fetchTask, type Task } from '../../api/tasks';

function TaskDetail({ taskId }: { taskId: string }) {
  const navigate = useNavigate();
  const { mutate: mutateCache } = useSWRConfig();
  const { trigger: triggerDelete, isMutating: isDeleting } = useSWRMutation(
    `/tasks/${taskId}`,
    (_key, { arg }: { arg: string }) => deleteTask(arg),
  );
  const {
    data: task,
    error,
    isLoading,
    isValidating,
  } = useSWR(`/tasks/${taskId}`, () => fetchTask(taskId));
  const [deleteError, setDeleteError] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  async function handleDelete() {
    if (!task) return;
    try {
      await triggerDelete(task.id, { revalidate: false });
      await mutateCache<Task[]>(
        '/tasks',
        (currentTasks) => currentTasks?.filter((item) => item.id !== task.id),
        { revalidate: false },
      );
      navigate('/');
    } catch (caughtError) {
      setDeleteError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to delete this task.',
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
  if (error && !task) {
    return (
      <SidebarLayout>
        <PageContent>
          <ErrorMessage
            message={error.message}
            onRetry={
              isRetryableError(error)
                ? () => void mutateCache(`/tasks/${taskId}`)
                : undefined
            }
            retrying={isValidating}
          />
        </PageContent>
      </SidebarLayout>
    );
  }
  if (!task) {
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
          to="/"
        >
          <ArrowLeft size={16} /> Back to tasks
        </Link>
        {deleteError && (
          <div className="mb-4">
            <ErrorMessage message={deleteError} />
          </div>
        )}
        {error && (
          <div className="mb-4">
            <ErrorMessage
              message={error.message}
              onRetry={
                isRetryableError(error)
                  ? () => void mutateCache(`/tasks/${taskId}`)
                  : undefined
              }
              retrying={isValidating}
            />
          </div>
        )}
        <Card className="gap-0 rounded-xl p-7 shadow-sm ring-1 ring-foreground/5 max-md:p-5">
          <div className="mb-5 flex items-center gap-3">
            <StatusBadge status={task.status} />
          </div>
          <h1 className="mb-3 break-words font-heading text-[28px] font-bold tracking-tight text-foreground max-md:text-2xl">
            {task.title}
          </h1>
          <p className="mb-6 min-h-10 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {task.description || 'No description has been added.'}
          </p>
          <div className="flex justify-end gap-2 border-t pt-5">
            <Button
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              variant="outline"
              type="button"
              onClick={() => {
                setDeleteError('');
                setIsDeleteDialogOpen(true);
              }}
            >
              <Trash2 size={16} /> Delete
            </Button>
            <Button asChild className="text-xs">
              <Link to={`/tasks/${task.id}/edit`}>Edit task</Link>
            </Button>
          </div>
        </Card>
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete task?</AlertDialogTitle>
              <AlertDialogDescription>
                Delete "{task.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={isDeleting}
                onClick={() => void handleDelete()}
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

export { TaskDetail };
