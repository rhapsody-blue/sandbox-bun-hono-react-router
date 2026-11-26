import { ListTodo } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { SidebarLayout } from '@/layout/sidebar-layout';

function NotFound() {
  return (
    <SidebarLayout>
      <section className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 grid size-[46px] place-items-center rounded-2xl bg-violet-50 text-violet-600">
          <ListTodo size={22} />
        </div>
        <h1 className="mb-2 font-heading text-2xl font-bold">Page not found</h1>
        <p className="mb-4 text-xs text-muted-foreground">
          We couldn’t find the page you were looking for.
        </p>
        <Button asChild className="text-xs">
          <Link to="/">Return to tasks</Link>
        </Button>
      </section>
    </SidebarLayout>
  );
}

export { NotFound };
