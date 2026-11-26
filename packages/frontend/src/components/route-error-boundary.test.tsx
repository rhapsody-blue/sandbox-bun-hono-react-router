import { describe, expect, it, spyOn } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { RouteErrorBoundary } from './route-error-boundary';

function BrokenRoute(): never {
  throw new Error('Internal error details');
}

describe('RouteErrorBoundary', () => {
  it('shows a safe fallback when a route render fails', async () => {
    const consoleError = spyOn(console, 'error').mockImplementation(() => {});
    const router = createMemoryRouter([
      {
        path: '/',
        element: <BrokenRoute />,
        errorElement: <RouteErrorBoundary />,
      },
    ]);

    try {
      render(<RouterProvider router={router} />);

      expect(
        await screen.findByRole('heading', { name: 'Something went wrong' }),
      ).toBeTruthy();
      expect(
        screen.getByRole('link', { name: 'Return to tasks' }),
      ).toBeTruthy();
      expect(screen.queryByText('Internal error details')).toBeNull();
    } finally {
      consoleError.mockRestore();
    }
  });
});
