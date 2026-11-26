# Agent guidance

## Documentation maintenance

**Important**: After completing any new development or changes, update this AGENTS.md file with:

- New architectural decisions or patterns introduced
- Changes to project structure or conventions
- New dependencies or tools and how to use them
- Common pitfalls or gotchas discovered
- Any setup steps or commands that differ from the documented workflow

This ensures future AI agents and developers have accurate, up-to-date guidance.

## Project structure

- This is a Bun monorepo with two workspaces:
  - `packages/backend`: Hono API server (runs on port 3000)
  - `packages/frontend`: React app with React Router (runs on port 5173)
- All workspaces are managed from the repository root using Bun's workspace features.

## Runtime and dependencies

- Bun is not installed on the host. Run Bun commands through Docker Compose; do not install or rely on a host Bun installation.
- The Compose development environment uses separate `backend` and `frontend` services with a shared Bun image/workspace. `dev-init` runs `bun install` once before either service starts; dependencies persist in Docker volumes.
- Run backend/root one-off commands with `docker compose run --rm backend <command>` and frontend commands with `docker compose run --rm frontend <command>`. Run `docker compose build` first if the development image has not been built.
- After changing a package manifest (`package.json`), update dependencies and `bun.lock` with `docker compose run --rm dev-init`. Do not edit the lockfile by hand.
- Dependencies are managed with Docker volumes (`node_modules`, `backend_node_modules`, `frontend_node_modules`) to persist across container restarts.

## Available scripts

Run these scripts from the repository root with `docker compose run --rm backend bun run <script>`:

- `dev`: Start both workspaces in parallel (Compose starts the backend and frontend as separate services)
- `build`: Build both workspaces for production
- `typecheck`: Run TypeScript type checking for all workspaces
- `lint`: Run Biome linter
- `format`: Format all files with Biome
- `check`: Run Biome checks and TypeScript checks for both workspaces (shows all errors from both tools)
- The root `prepare` script installs Husky hooks. On commit, lint-staged runs `biome check --write` for staged JS/TS, CSS, and JSON files. Run Git commits from the Dev Container so Bun and project dependencies are available to the hook.

## Code quality

- Biome is configured at the repository root (`biome.json`) and checks both `packages/backend` and `packages/frontend`.
- Run `docker compose run --rm backend bun run check` to run Biome and TypeScript checks for both workspaces.
  - This script runs both checks sequentially and shows all errors from both tools, even if one fails.
- Run `docker compose run --rm backend bun run format` to apply Biome formatting.
- Keep shared TypeScript options in the root `tsconfig.json` and package-specific options in each workspace's `tsconfig.json`.
- Shared development tools (Biome, TypeScript, etc.) belong in the root `package.json`; workspace-specific dependencies belong in that workspace's `package.json`.
- **All comments and strings in source code should be in English.**

## Development workflow

- The Dev Container starts `backend` as the workspace container and runs `db`, `keycloak`, and `frontend` alongside it. Compose runs `dev-init` to install dependencies before starting the application services. `NODE_ENV=development` is set only for the dev-server commands; one-off Vite builds inherit no development `NODE_ENV` and therefore use production settings.
- Backend is accessible at `http://localhost:3000` with a health endpoint at `http://localhost:3000/api/health`.
- Frontend is accessible at `http://localhost:5173`.
- Swagger UI is served by the separate `openapi` Compose service at `http://localhost:8081/`; the root contract is at `http://localhost:8081/openapi.yaml`.
- CORS is configured to allow frontend-backend communication in development.

## Database

- PostgreSQL 16 is used as the primary database, running in a Docker container.
- The database is accessible at `postgresql://user:password@db:5432/mydb` from within Docker containers.
- Prisma ORM 7 is used for database access and schema management.
- **Important**: Prisma 7 requires importing `PrismaClient` from the generated client path (`../../node_modules/.prisma/client`), not from `@prisma/client`.
- After changing the Prisma schema, run `docker compose run --rm backend bun run --filter backend db:generate` to regenerate the client.
- Prisma migration history starts with `20261126000000_init`. For a database that was previously managed with `db:push`, mark that baseline as applied before `db:deploy`; the Keycloak/task-owner migration workflow is documented in `packages/backend/README.md`.
- Database volumes persist data across container restarts.

## Backend structure

- **`src/index.ts`**: Application entry point; mounts CORS middleware, all API routes under `/api`, and the OpenAPI/Swagger UI endpoints
- **`src/handlers/`**: Handler functions built with `createFactory().createHandlers()` (`hono/factory`), co-located with their Zod schemas (e.g., `tasks.ts` and `tasks.zod.ts`)
- **`src/lib/`**: Shared utilities and configurations (e.g., Prisma client and Pino logger)
- **`src/middleware/`**: Shared Hono middleware, including Pino-backed structured request logging
- **Authentication and authorization**: `src/middleware/auth.ts` verifies Keycloak access-token signatures through remote JWKS and validates issuer/audience/expiry; it puts only the token subject (`sub`) in Hono Context. Task permissions, `admin`/`user` role assignments, and ownership checks are evaluated by Casbin in `src/authz/authorization.ts`, with policies persisted to Prisma's `CasbinRule` table. Base task policies are installed by a Prisma migration, not seeded at application startup; operator-managed changes require restarting the backend to reload its in-memory enforcer. New authenticated subjects are assigned the default `user` role. Grant an administrator with `docker compose run --rm -e CASBIN_SUBJECT=<keycloak-subject> backend bun run --filter backend authz:grant-admin`. Local Keycloak imports `keycloak/realm-export.json`, loads the custom login theme from `keycloak/themes/task-app`, and disables theme caching for development; the development-only `alice`/`alice` and `bob`/`bob` users and direct access grants must never be used outside local development. Use Authorization Code with PKCE for production browser clients.
- Backend logs are JSON written to standard output. Configure the Pino minimum log level with `LOG_LEVEL` (defaults to `info`); Compose forwards the host variable to the backend container. The request middleware generates a UUID per request, stores it with a request-scoped Pino child logger in Hono context, and returns it as `X-Request-ID`; use `c.get('logger')` in request handlers to keep log events correlated. Pino redacts common credential fields in structured log fields at the top level and up to five nested levels. Do not log raw exception messages or stacks because they can contain secrets. Unexpected errors are handled by `app.onError()` and return a generic JSON 500; unmatched routes use `app.notFound()` and return JSON 404. Map only known Prisma missing-record errors to 404 rather than catching all database errors.
- **OpenAPI & Validation (`hono-openapi`)**:
  - The canonical OpenAPI 3.1.0 contract is the root-level `openapi/openapi.yaml`, independent of either workspace. Keep it aligned with the backend route handlers and their runtime Zod validation schemas.
  - The separate `openapi` service in `compose.yaml` serves Swagger UI and the YAML on port 8081 using `docker/openapi.conf.template`; its read-only volume mount keeps the contract outside both packages.
  - The OpenAPI service reverse-proxies `/api/` requests to the backend so the spec's relative `servers.url: /api` works from the UI's origin without CORS. Keep this proxy path aligned with the contract's `servers` entry.
  - Use `validator('param' | 'json' | 'query', Schema)` from `hono-openapi` for runtime request validation. Do not add OpenAPI operation metadata to handlers; documentation belongs in the root YAML.
  - The backend build intentionally marks `zod-to-json-schema` external. `hono-openapi` depends on `@standard-community/standard-json`, which contains an optional literal import of this package; Bun still tries to resolve it at build time even though the runtime import is caught when the package is absent. Current schemas use Zod v4, whose adapter does not need `zod-to-json-schema`. It also marks `@prisma/client` external because `casbin-prisma-adapter` has a fallback runtime import; the application passes its generated Prisma client instance, so that fallback is not used. Remove either external flag only after the dependency chain no longer causes an unresolved-import error, and verify that the backend bundle can be built and started.
- **API documentation**: Available at `http://localhost:8081/` (Swagger UI)
- **OpenAPI spec**: Available at `http://localhost:8081/openapi.yaml`; edit `openapi/openapi.yaml` at the repository root.

## Frontend structure

- **`src/main.tsx`**: React Router route table and application bootstrap; initializes `AuthProvider` before mounting the app, provides the app-wide `SWRConfig` from `src/lib/swr-config.ts`, a parent route error boundary, and `PageLoadingSkeleton` as the lazy-route fallback. Task screens are loaded with `React.lazy` to split route code from the initial bundle. Imports the shared stylesheet and route screens from `src/pages/`.
- **`src/pages/tasks/`**: Task list, task detail, create/edit screens, and their tests. Global not-found screen stays in `src/pages/`.
- **`src/layout/sidebar-layout.tsx`**: Shared sidebar layout and navigation for frontend pages, including sign-in status and the Keycloak logout action.
- Use React Router's `Link` with `to` for internal navigation instead of plain `<a href>`; keep normal anchors for external links and browser-native destinations.
- **`src/components/`**: Shared components such as error messages, loading states, page content layout, and `PageLoadingSkeleton`. The page-loading fallback composes the generated `src/components/ui/skeleton.tsx` primitive. Keep task-specific components under `src/pages/tasks/components/`.
- **`src/lib/`**: Shared frontend utilities and configuration, including Keycloak initialization/token refresh (`keycloak.ts`), API error types/retry policy (`errors.ts`), and the global SWR configuration (`swr-config.ts`). The frontend uses `keycloak-js` with Authorization Code and PKCE; defaults are `http://localhost:8080`, realm `task-app`, and client `task-web`, overridable with `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, and `VITE_KEYCLOAK_CLIENT_ID`.
- **`src/components/auth-provider.tsx`**: Initializes the Keycloak browser session without redirecting unauthenticated visitors; shows a React login prompt and withholds application routes until authentication succeeds.
- **`src/pages/tasks/components/status-badge.tsx`**: Task status badge used by task list and detail pages.
- Task status labels are formatted in the task-specific `StatusBadge` component.
- Frontend tests use Bun's test runner, React Testing Library, `user-event`, `happy-dom`, and MSW. Keep page-level test files beside their screens (`list.test.tsx`, `detail.test.tsx`, and `form.test.tsx`), with each test case spelling out its SWR and router providers inline rather than extracting `TestProviders` or `CurrentPath` helpers. Use React Router routes to assert navigation results. The frontend `bunfig.toml` preloads `test-setup.ts`, which registers happy-dom, runs React Testing Library's `cleanup()` after each test, and exports `createTestNetwork` to set up MSW's fetch interceptor, network lifecycle, and shared `onUnhandledFrame: "error"`/`context.quiet` options. Keep operation-specific task handlers and their aggregator in `src/api/tasks.msw.ts`, with deterministic typed response fixtures in `src/api/tasks.fixtures.ts`. Use `network.use()` for per-test handler overrides; `createTestNetwork` resets overrides after each test. Use wildcard MSW URL patterns such as `*/api/tasks` so handlers match the API path regardless of `VITE_API_URL`'s origin. Because `msw/node` does not intercept Bun's native `fetch`, use `defineNetwork` with `FetchInterceptor` from `@mswjs/interceptors/fetch/web`. The frontend `tsconfig.json` sets `customConditions: ["browser"]` so TypeScript resolves the browser variant consistently for MSW and `@mswjs/interceptors`, removing the nominal Node/browser type mismatch. Run tests with `docker compose run --rm frontend bun run --filter frontend test`.
- **`src/api/tasks.ts`**: Typed task API client matching the backend task schema; adds a refreshed Keycloak access token as a Bearer token to authenticated requests. Set `VITE_API_URL` to override the default `http://localhost:3000/api` base URL. See `src/api/tasks.msw.ts` for typed MSW handlers.
- **`src/index.css`**: Tailwind CSS v4 import and shadcn/ui theme tokens. Keep page-level styling in Tailwind utility classes and reuse generated components from `src/components/ui/`.
- **Content Security Policy**: `index.html` sets the frontend CSP with a meta tag. It allows same-origin assets, the local backend and Keycloak API connections, and the Vite HMR WebSocket. Inline styles are allowed for Vite's development CSS injection; inline scripts and `eval` remain disallowed. Update `connect-src` for non-local API/Keycloak origins when deploying. A meta policy cannot set `frame-ancestors`; configure CSP response headers at the production HTML host if that directive or a stricter production policy is needed.
- **`.storybook/`**: Storybook configuration for the frontend. Stories are colocated with the components they document; import `src/index.css` in the preview so stories use the app theme and Tailwind styles. Register `@storybook/addon-docs` to render autodocs pages; the `autodocs` tag alone is not sufficient. Run with `docker compose run --rm -p 127.0.0.1:6006:6006 frontend bun run --filter frontend storybook` and build with `docker compose run --rm frontend bun run --filter frontend build-storybook`.
- **`components.json`**: shadcn/ui registry and component aliases. Keep source aliases aligned with existing directories; set the `utils` alias to `cn` so generated UI components import the class helper directly. UI imports use the `@/` alias configured in Vite and the frontend TypeScript config.
- The frontend uses Vite 7 with `@vitejs/plugin-react` 4.7+; keep their peer-dependency ranges compatible when upgrading frontend tooling. Vite 7 requires Node.js 20.19+ or 22.12+ when running under Node; this project runs it with Bun in Docker.
- Tailwind CSS v4 is integrated with `@tailwindcss/vite`; use `bunx shadcn add <component>` from `packages/frontend` to add UI primitives.
- Treat shadcn/ui components in `src/components/ui/` as generated primitives: generally do not change their internals. Prefer configuring or composing them at call sites; modify a primitive only when the task specifically requires it and there is no suitable alternative.
- Keep shadcn/ui primitives limited to components currently used by the app; remove unused generated subcomponents and exports instead of retaining the full generated catalog.
- Biome's CSS parser has `tailwindDirectives` enabled for the Tailwind v4 directives in `src/index.css`.
- The frontend uses Geist Variable as the bundled font; do not add external font/CDN requests.
- SWR cache keys use `/tasks` and `/tasks/:id`; use `useSWR` for GET requests and `useSWRMutation` for create, update, and delete requests. Update `/tasks` explicitly with mutation results when a list hook may be unmounted; update mutations can populate the matching detail cache.
- **Frontend error handling**: `src/api/tasks.ts` throws the shared `ApiError` from `src/lib/errors.ts` with the HTTP status; `isRetryableError` excludes HTTP client errors from retry. The app-wide `SWRConfig` in `src/lib/swr-config.ts` retries network and server errors at most twice. Query screens show inline retry actions, retain stale data during revalidation failures, and do not offer retries for 4xx responses. Mutation failures stay in the form or page that initiated the operation. React Router's parent `errorElement` renders `RouteErrorBoundary` for unexpected route/render errors; it is separate from SWR and event-handler error handling.
- The task UI intentionally stays minimal: list, details, create, edit, and delete. Use the shadcn/ui AlertDialog to confirm task deletion, and show deletion errors inline with the shared ErrorMessage component instead of native browser dialogs. The form only edits title, description, and status; priority and due-date fields are not part of this UI.
- The task API accepts a required title and optional description on create, and optional title, nullable description, and optional status on update.
- Frontend dependencies for SWR and Lucide icons are installed in the frontend workspace. Run frontend checks with `docker compose run --rm frontend bun run --filter frontend typecheck` and builds with `docker compose run --rm frontend bun run --filter frontend build`.

## Common tasks

- **Add a dependency to a workspace**:

  ```sh
  docker compose run --rm backend bun add <package> --filter <workspace-name>
  # Example: docker compose run --rm backend bun add zod --filter backend
  ```

- **Add a dev dependency to a workspace**:

  ```sh
  docker compose run --rm backend bun add -d <package> --filter <workspace-name>
  ```

- **Add a shared dev tool to the root**:

  ```sh
  docker compose run --rm backend bun add -d <package>
  ```

- **Rebuild the Docker image after Dockerfile changes**:

  ```sh
  docker compose build
  ```

- **Run Prisma commands**:

  ```sh
  # Generate Prisma Client
  docker compose run --rm backend bun run --filter backend db:generate

  # Push schema changes to database (development)
  docker compose run --rm backend bun run --filter backend db:push

  # Create and run migrations (production)
  docker compose run --rm backend bun run --filter backend db:migrate

  # Apply committed migrations to a database
  docker compose run --rm backend bun run --filter backend db:deploy

  # Open Prisma Studio
  docker compose run --rm backend bun run --filter backend db:studio
  ```
