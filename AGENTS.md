# Agent guidance

## Project structure

- This is a Bun monorepo with two workspaces:
  - `packages/backend`: Hono API server (runs on port 3000)
  - `packages/frontend`: React app with React Router (runs on port 5173)
- All workspaces are managed from the repository root using Bun's workspace features.

## Runtime and dependencies

- Bun is not installed on the host. Run Bun commands through Docker Compose; do not install or rely on a host Bun installation.
- Run one-off commands with `docker compose run --rm app <command>`. If the app image has not been built yet, run `docker compose build app` first.
- After changing a package manifest (`package.json`), update dependencies and `bun.lock` with `docker compose run --rm app bun install`. Do not edit the lockfile by hand.
- Dependencies are managed with Docker volumes (`node_modules`, `backend_node_modules`, `frontend_node_modules`) to persist across container restarts.

## Available scripts

Run these scripts from the repository root with `docker compose run --rm app bun run <script>`:

- `dev`: Start both backend and frontend in parallel (dev servers with hot reload)
- `build`: Build both workspaces for production
- `typecheck`: Run TypeScript type checking for all workspaces
- `lint`: Run Biome linter
- `format`: Format all files with Biome
- `check`: Run Biome checks and TypeScript checks for both workspaces (shows all errors from both tools)

## Code quality

- Biome is configured at the repository root (`biome.json`) and checks both `packages/backend` and `packages/frontend`.
- Run `docker compose run --rm app bun run check` to run Biome and TypeScript checks for both workspaces.
  - This script runs both checks sequentially and shows all errors from both tools, even if one fails.
- Run `docker compose run --rm app bun run format` to apply Biome formatting.
- Keep shared TypeScript options in the root `tsconfig.json` and package-specific options in each workspace's `tsconfig.json`.
- Shared development tools (Biome, TypeScript, etc.) belong in the root `package.json`; workspace-specific dependencies belong in that workspace's `package.json`.

## Development workflow

- The Dev Container setup automatically runs `bun install` and `bun run dev` on startup.
- Backend is accessible at `http://localhost:3000` with a health endpoint at `http://localhost:3000/api/health`.
- Frontend is accessible at `http://localhost:5173`.
- CORS is configured to allow frontend-backend communication in development.

## Common tasks

- **Add a dependency to a workspace**: 
  ```sh
  docker compose run --rm app bun add <package> --filter <workspace-name>
  # Example: docker compose run --rm app bun add zod --filter backend
  ```
- **Add a dev dependency to a workspace**:
  ```sh
  docker compose run --rm app bun add -d <package> --filter <workspace-name>
  ```
- **Add a shared dev tool to the root**:
  ```sh
  docker compose run --rm app bun add -d <package>
  ```
- **Rebuild the Docker image after Dockerfile changes**:
  ```sh
  docker compose build app
  ```
