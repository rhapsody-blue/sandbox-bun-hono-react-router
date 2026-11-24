# backend

Backend API server using Hono framework.

## Setup

Install dependencies from the workspace root:

```bash
bun install
```

## Development

Run the development server with hot reload:

```bash
bun run dev
```

The server will start at `http://localhost:3000`.

## Build

Build the production bundle:

```bash
bun run build
```

## Production

Run the built application:

```bash
bun run start
```

## Type Check

Run TypeScript type checking:

```bash
bun run typecheck
```

## API Endpoints

- `GET /` - Health check endpoint
- `GET /api/health` - API health status
