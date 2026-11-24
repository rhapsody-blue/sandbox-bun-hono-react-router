# sandbox-bun-hono-react-router

## Dev Container

### Requirements

- Docker Desktop (or another Docker Compose-compatible engine)
- VS Code with the Dev Containers extension

### Open the project

1. Open this repository in VS Code.
2. Run **Dev Containers: Reopen in Container** from the Command Palette.
3. Wait for the container to start. It installs dependencies and starts the backend and frontend.

The frontend is available at <http://localhost:5173>, and the backend health endpoint is at <http://localhost:3000/api/health>.

The same setup can be started without VS Code with `docker compose up --build`.

## Code quality

Run Biome and TypeScript checks for both workspaces:

```sh
docker compose run --rm app bun run check
```

Format files with Biome:

```sh
docker compose run --rm app bun run format
```
