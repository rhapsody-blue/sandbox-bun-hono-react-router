import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
  useParams,
} from 'react-router';
import { SWRConfig } from 'swr';
import './index.css';
import { AuthProvider } from './components/auth-provider';
import { PageLoadingSkeleton } from './components/page-loading-skeleton';
import { RouteErrorBoundary } from './components/route-error-boundary';
import { swrConfig } from './lib/swr-config';
import { NotFound } from './pages/not-found';

const TaskDetail = React.lazy(async () => ({
  default: (await import('./pages/tasks/detail')).TaskDetail,
}));
const TaskForm = React.lazy(async () => ({
  default: (await import('./pages/tasks/form')).TaskForm,
}));
const TaskList = React.lazy(async () => ({
  default: (await import('./pages/tasks/list')).TaskList,
}));

function TaskDetailRoute() {
  const { id } = useParams();
  return id ? <TaskDetail taskId={id} /> : <NotFound />;
}

function TaskEditRoute() {
  const { id } = useParams();
  return id ? <TaskForm taskId={id} /> : <NotFound />;
}

const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <TaskList />,
      },
      {
        path: 'tasks/new',
        element: <TaskForm />,
      },
      {
        path: 'tasks/:id',
        element: <TaskDetailRoute />,
      },
      {
        path: 'tasks/:id/edit',
        element: <TaskEditRoute />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AuthProvider>
      <SWRConfig value={swrConfig}>
        <React.Suspense fallback={<PageLoadingSkeleton />}>
          <RouterProvider router={router} />
        </React.Suspense>
      </SWRConfig>
    </AuthProvider>
  </React.StrictMode>,
);
