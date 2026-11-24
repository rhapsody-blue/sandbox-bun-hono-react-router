import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import App from './App';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/about',
    element: <div style={{ padding: '2rem' }}>About Page</div>,
  },
  {
    path: '*',
    element: (
      <div style={{ padding: '2rem' }}>
        <h1>404 - Page Not Found</h1>
        <p>お探しのページが見つかりませんでした。</p>
        <a href="/">ホームに戻る</a>
      </div>
    ),
  },
]);

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
