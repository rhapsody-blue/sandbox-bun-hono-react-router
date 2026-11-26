import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  getAuthenticatedUsername,
  initializeKeycloak,
  loginToKeycloak,
  logoutFromKeycloak,
} from '@/lib/keycloak';

type AuthContextValue = {
  username: string | undefined;
  logout: () => Promise<void>;
};

type AuthState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'unauthenticated'; message?: string; isRedirecting?: boolean }
  | { status: 'authenticated'; username: string | undefined };

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    initializeKeycloak()
      .then((authenticated) => {
        if (active) {
          setAuthState(
            authenticated
              ? {
                  status: 'authenticated',
                  username: getAuthenticatedUsername(),
                }
              : { status: 'unauthenticated' },
          );
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setAuthState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Unable to connect to Keycloak.',
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleLogin() {
    setAuthState({ status: 'unauthenticated', isRedirecting: true });
    try {
      await loginToKeycloak();
    } catch (error: unknown) {
      setAuthState({
        status: 'unauthenticated',
        message:
          error instanceof Error ? error.message : 'Unable to start sign-in.',
      });
    }
  }

  if (authState.status === 'loading') {
    return (
      <main className="grid min-h-screen place-items-center" role="status">
        <p className="text-sm text-muted-foreground">Connecting to Keycloak…</p>
      </main>
    );
  }

  if (authState.status === 'error') {
    return (
      <main
        className="mx-auto grid min-h-screen max-w-lg content-center gap-4 px-6"
        role="alert"
      >
        <div>
          <h1 className="text-xl font-semibold">Sign-in failed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {authState.message}
          </p>
        </div>
        <Button
          className="w-fit"
          onClick={() => window.location.reload()}
          type="button"
        >
          Try again
        </Button>
      </main>
    );
  }

  if (authState.status === 'unauthenticated') {
    return (
      <main className="grid min-h-screen place-items-center px-6 py-12">
        <section className="w-full max-w-sm rounded-xl border bg-card p-8 text-card-foreground shadow-sm">
          <div className="mb-6 grid size-11 place-items-center rounded-xl bg-brand text-brand-foreground">
            <span className="text-xl font-bold">T</span>
          </div>
          <h1 className="text-2xl font-bold">Welcome to Task Manager</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Sign in to create and manage your tasks. You will be redirected to
            Keycloak to securely authenticate.
          </p>
          {authState.message && (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {authState.message}
            </p>
          )}
          <Button
            className="mt-6 w-full"
            disabled={authState.isRedirecting}
            onClick={() => void handleLogin()}
            type="button"
          >
            {authState.isRedirecting ? 'Redirecting to Keycloak…' : 'Log in'}
          </Button>
        </section>
      </main>
    );
  }

  return (
    <AuthContext.Provider
      value={{ username: authState.username, logout: logoutFromKeycloak }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function useOptionalAuth() {
  return useContext(AuthContext);
}

export { AuthProvider, useOptionalAuth };
