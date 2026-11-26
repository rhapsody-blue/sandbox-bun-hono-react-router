import { Skeleton } from '@/components/ui/skeleton';

const skeletonRows = ['task-1', 'task-2', 'task-3', 'task-4', 'task-5'];

function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen" role="status" aria-busy="true">
      <aside className="border-b bg-sidebar px-4 py-3 md:fixed md:inset-y-0 md:left-0 md:w-56 md:border-r md:border-b-0 md:p-5">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-7 rounded-lg" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="mt-8">
          <Skeleton className="h-9 w-20" />
        </div>
      </aside>
      <main className="min-h-screen md:ml-56">
        <section className="mx-auto w-full max-w-[1120px] px-6 pt-10 pb-6 max-md:px-4 max-md:pt-7 md:px-[42px]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="grid gap-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-9 w-28" />
          </div>
          <div className="overflow-hidden rounded-lg bg-card p-5 shadow-sm ring-1 ring-foreground/5">
            <div className="mb-4 flex items-center gap-4 border-b pb-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="grid gap-4">
              {skeletonRows.map((row) => (
                <div
                  className="flex items-center justify-between gap-4"
                  key={row}
                >
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <span className="sr-only">Loading page</span>
    </div>
  );
}

export { PageLoadingSkeleton };
