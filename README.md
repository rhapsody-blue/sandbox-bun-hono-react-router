# sandbox-bun-hono-react-router

## Dev Container

### Requirements

- Docker Desktop (or another Docker Compose-compatible engine)
- VS Code with the Dev Containers extension

### Open the project

1. Open this repository in VS Code.
2. Run **Dev Containers: Reopen in Container** from the Command Palette.
3. Wait for the containers to start. Compose installs dependencies, then starts the backend and frontend separately.

The frontend is available at <http://localhost:5173>, and the backend health endpoint is at <http://localhost:3000/api/health>.
Swagger UI is available at <http://localhost:8081/>, and the OpenAPI contract is at <http://localhost:8081/openapi.yaml>.
The local Keycloak instance is available at <http://localhost:8080>; see the
[backend README](./packages/backend/README.md#local-keycloak) for browser
verification steps, test accounts, and direct API instructions.

The same setup can be started without VS Code with `docker compose up --build`.
Compose runs the API (`backend`), OpenAPI static server (`openapi`), and Vite
(`frontend`) in separate containers.
The `dev-init` service installs workspace dependencies before either development
server starts. After editing a package manifest, rerun it with
`docker compose run --rm dev-init`.

## Storybook

Start Storybook in Docker and open <http://localhost:6006>:

```sh
docker compose run --rm -p 127.0.0.1:6006:6006 frontend bun run --filter frontend storybook
```

Build the Storybook static site with:

```sh
docker compose run --rm frontend bun run --filter frontend build-storybook
```

## Code quality

Run Biome and TypeScript checks for both workspaces:

```sh
docker compose run --rm backend bun run check
```

Format files with Biome:

```sh
docker compose run --rm backend bun run format
```

On commit, Husky runs lint-staged on staged JavaScript, TypeScript, CSS, and JSON files. Biome checks and formats those files before the commit proceeds. Run Git commits from the Dev Container, where Bun and the project dependencies are available.
