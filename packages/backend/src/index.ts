import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// CORS middleware for frontend access
app.use(
  '/*',
  cors({
    origin: ['http://localhost:5173'],
    credentials: true,
  }),
);

app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono!' });
});

app.get('/api/health', (c) => {
  return c.json({ status: 'ok' });
});

const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
};

console.log(`Server running on http://localhost:${port}`);
