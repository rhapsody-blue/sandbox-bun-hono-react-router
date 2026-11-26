import { cn } from 'cn';
import type { ReactNode } from 'react';

function PageContent({
  children,
  narrow = false,
}: {
  children: ReactNode;
  narrow?: boolean;
}) {
  return (
    <section
      className={cn(
        'mx-auto w-full px-6 pt-10 pb-6 max-md:px-4 max-md:pt-7',
        narrow ? 'max-w-[870px]' : 'max-w-[1120px] md:px-[42px]',
      )}
    >
      {children}
    </section>
  );
}

export { PageContent };
