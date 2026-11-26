import { Check, ListTodo, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useOptionalAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';

function SidebarLayout({ children }: { children: ReactNode }) {
  const auth = useOptionalAuth();
  const [logoutError, setLogoutError] = useState('');

  return (
    <div className="min-h-screen">
      <aside className="border-b bg-sidebar px-4 py-3 md:fixed md:inset-y-0 md:left-0 md:w-56 md:border-r md:border-b-0 md:p-5">
        <Link
          className="inline-flex items-center gap-2.5 font-sans text-lg font-bold tracking-tight text-foreground"
          to="/"
        >
          <span className="grid size-7 place-items-center rounded-lg bg-brand text-brand-foreground">
            <Check size={18} strokeWidth={3} />
          </span>
          <span>Task Manager</span>
        </Link>
        <nav className="mt-8 max-md:absolute max-md:top-2.5 max-md:right-4">
          <Link
            className="inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary"
            to="/"
          >
            <ListTodo size={17} />
            Tasks
          </Link>
        </nav>
        {auth && (
          <div className="mt-8 border-t pt-4 md:absolute md:inset-x-5 md:bottom-5">
            <p className="mb-2 truncate text-xs text-muted-foreground">
              {auth.username ? (
                <>
                  Signed in as{' '}
                  <span className="font-medium">{auth.username}</span>
                </>
              ) : (
                'Signed in'
              )}
            </p>
            <Button
              className="w-full justify-start"
              onClick={() => {
                setLogoutError('');
                void auth.logout().catch((error: unknown) => {
                  setLogoutError(
                    error instanceof Error
                      ? error.message
                      : 'Unable to sign out.',
                  );
                });
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              <LogOut />
              Log out
            </Button>
            {logoutError && (
              <p className="mt-2 text-xs text-destructive" role="alert">
                {logoutError}
              </p>
            )}
          </div>
        )}
      </aside>
      <main className="min-h-screen md:ml-56">{children}</main>
    </div>
  );
}

export { SidebarLayout };
