import type { ReactNode } from 'react';

function LoadingState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export { LoadingState };
