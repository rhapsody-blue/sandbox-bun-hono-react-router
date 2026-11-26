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
- `/api/tasks` - Task CRUD; requires a valid Keycloak bearer token and an applicable Casbin policy.

The canonical contract is `openapi/openapi.yaml` at the repository root. The
Compose `openapi` service serves Swagger UI at <http://localhost:8081/> and the
contract at <http://localhost:8081/openapi.yaml>. It also proxies `/api/`
requests to the backend so Swagger UI can run requests against the API.

The root-level YAML file is the API documentation contract and its source of
truth. Keep its operations and schemas aligned with the backend route handlers
and their runtime validation schemas.

## Local Keycloak

`docker compose up --build` starts Keycloak at <http://localhost:8080> and
imports the development-only `task-app` realm. The test users are `alice` /
`alice` and `bob` / `bob`; the development admin console uses `admin` / `admin`.
These credentials and the Keycloak development mode are for local testing only.
Do not use them in a shared or production environment.
The login page uses the local `task-app` theme in `keycloak/themes/task-app`,
styled to match the React app. Compose mounts the theme and disables theme
caching for development; refresh the login page after stylesheet changes. The
realm export selects this theme for new imports. For an existing realm, select
`task-app` under **Realm Settings → Themes → Login Theme** and save.

To verify authentication from the React app, open <http://localhost:5173>.
The app shows a welcome screen. Click **Log in** to continue to Keycloak, which
authenticates using Authorization Code with PKCE. Sign in as `alice` / `alice`;
the sidebar shows the sign-in status and provides a logout action. Create a
task, log out, then sign in as `bob` / `bob` to verify that Bob cannot see
Alice's tasks.

Get an access token for local API testing:

```bash
curl -sS -X POST http://localhost:8080/realms/task-app/protocol/openid-connect/token \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=password' \
  --data-urlencode 'client_id=task-web' \
  --data-urlencode 'username=alice' \
  --data-urlencode 'password=alice'
```

Send the returned `access_token` as `Authorization: Bearer <token>` when
calling task endpoints. Direct access grants are enabled only to simplify local
verification; production clients should use Authorization Code with PKCE.
The frontend uses `keycloak-js` with PKCE and refreshes the access token before
each API request. Override its defaults with `VITE_KEYCLOAK_URL`,
`VITE_KEYCLOAK_REALM`, and `VITE_KEYCLOAK_CLIENT_ID` if the local Keycloak
configuration changes.
The API validates the token signature against Keycloak's JWKS, as well as its
issuer, audience, and expiry. The token subject is then passed to Casbin; role
assignments and authorization policies are stored in the `casbin_rule` table.
The first authenticated task request assigns a subject the default `user` role
if it has no Casbin role. Users can create and manage their own tasks, while an
`admin` role can access all tasks. Keycloak realm roles are not used for
authorization. Existing tasks are assigned the non-loginable
`legacy-unassigned` owner by the migration and are not exposed to authenticated
users.

Grant an administrator role from an operator-controlled environment using the
Keycloak `sub` claim (not the username). Restart the app after changing a role
so its in-memory Casbin enforcer reloads policies:

```bash
docker compose run --rm -e CASBIN_SUBJECT=<keycloak-subject> backend bun run --filter backend authz:grant-admin
docker compose restart backend
```

The task policy migration seeds rules that allow `user` to create/list/read/
update/delete owned tasks and `admin` to perform all actions on all tasks.
Policies are stored in the Casbin table and loaded when the backend starts;
restart the backend after operator-managed changes.

For a fresh database, apply the migrations with
`docker compose run --rm backend bun run --filter backend db:deploy`, then
regenerate the Prisma client with
`docker compose run --rm backend bun run --filter backend db:generate`.
For an existing development database created with `db:push`, baseline the
existing schema once before applying later migrations:

```bash
docker compose run --rm backend sh -c 'cd packages/backend && bunx prisma migrate resolve --applied 20261126000000_init --schema=./prisma/schema.prisma'
docker compose run --rm backend bun run --filter backend db:deploy
docker compose run --rm backend bun run --filter backend db:generate
```

## Logging and Errors

Requests and unexpected errors are logged as JSON to standard output with Pino.
Set `LOG_LEVEL` in the host environment to configure the minimum log level;
Docker Compose forwards it to the backend and defaults to `info`.
Each request gets a server-generated UUID in the `requestId` log field and the
`X-Request-ID` response header. Use the request-scoped logger from Hono context
(`c.get('logger')`) for logs emitted inside a handler so they include that ID.
Common credential fields (passwords, tokens, API keys, authorization and cookie
headers) are redacted in structured log fields at the top level and up to five
nested levels. Error messages and stacks are intentionally not logged because
they may contain secrets; error type, request ID, method, path, and status
remain available for diagnosis.

Unexpected errors return a generic JSON `500` response. Task update and delete
operations return `404` only when Prisma reports that the requested record does
not exist. Unmatched routes return a JSON `404` response.
