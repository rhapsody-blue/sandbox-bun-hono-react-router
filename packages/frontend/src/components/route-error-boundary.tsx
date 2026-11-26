import { Link } from 'react-router';
import { PageContent } from '@/components/page-content';
import { Button } from '@/components/ui/button';
import { SidebarLayout } from '@/layout/sidebar-layout';

function RouteErrorBoundary() {
  return (
    <SidebarLayout>
      <PageContent>
        <section className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
          <h1 className="mb-2 font-heading text-2xl font-bold">
            Something went wrong
          </h1>
          <p className="mb-4 text-sm text-muted-foreground">
            An unexpected error occurred. Return to your tasks and try again.
          </p>
          <Button asChild>
            <Link to="/">Return to tasks</Link>
          </Button>
        </section>
      </PageContent>
    </SidebarLayout>
  );
}

export { RouteErrorBoundary };
