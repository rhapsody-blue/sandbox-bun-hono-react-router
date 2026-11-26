import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import * as tasksHandler from './handlers/tasks';
import { type AuthEnv, authenticate } from './middleware/auth';
import { requestLogger } from './middleware/request-logger';

const app = new Hono<AuthEnv>();

app.use('/*', requestLogger);

app.use(
  '/*',
  cors({
    origin: ['http://localhost:5173'],
    credentials: true,
    exposeHeaders: ['X-Request-ID'],
  }),
);

app.onError((error, c) => {
  const status = error instanceof HTTPException ? error.status : 500;
  const log = c.get('logger');
  const logFields = {
    errorType: error.name,
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    status,
  };

  if (status >= 500) {
    log.error(logFields, 'Request failed');
    return c.json({ error: 'Internal Server Error' }, 500);
  }

  log.warn(logFields, 'Request failed');
  return c.json({ error: error.message }, status);
});

app.notFound((c) => c.json({ error: 'Not Found' }, 404));

app.get('/api/health', (c) => {
  return c.json({ status: 'ok' });
});

app.use('/api/tasks', authenticate);
app.use('/api/tasks/*', authenticate);

app.get('/api/tasks', ...tasksHandler.list);
app.get('/api/tasks/:id', ...tasksHandler.show);
app.post('/api/tasks', ...tasksHandler.create);
app.put('/api/tasks/:id', ...tasksHandler.update);
app.delete('/api/tasks/:id', ...tasksHandler.destroy);

const port = Number(process.env.PORT) || 3000;

export { app };

export default {
  port,
  fetch: app.fetch,
};
