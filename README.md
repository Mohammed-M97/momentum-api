# Todo API

A REST API for a personal todo/task manager, built with Express 5 and MongoDB (Mongoose).
Users register and log in, receive a JWT, and every task route is scoped to the
authenticated user — you can only ever see and modify your own tasks.

## Features

- **Email + password auth** — passwords hashed with bcrypt via a Mongoose `pre("save")` hook, so plaintext never reaches the database.
- **JWT sessions** — tokens signed with `JWT_SECRET`, valid for 1 hour, sent as `Authorization: Bearer <token>`.
- **Per-user task isolation** — `verifyToken` puts the user id on the request, and every task query filters by `user: req.userId`.
- **Soft deletes** — `DELETE` sets a `deletedAt` timestamp instead of removing the document; all reads filter on `deletedAt: null`, so nothing is ever lost.
- **Whitelisted updates** — `PUT` only applies fields from an explicit allow-list, so clients cannot overwrite `user`, `deletedAt`, or anything else internal.
- **Clean JSON output** — a `toJSON` transform renames `_id` to `id` and strips `__v` and the internal `user` field.
- **CORS** configured for a Vite frontend on `http://localhost:5173`.

## Tech stack

| | |
|---|---|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | MongoDB via Mongoose |
| Auth | jsonwebtoken + bcrypt |
| Dev | nodemon, dotenv |

## Getting started

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

```
MONGO_URI=mongodb://localhost:27017/todo-api
JWT_SECRET=some-long-random-string
```

`JWT_SECRET` is required — the server throws on startup if it is missing.

```bash
npm run dev     # nodemon, auto-restart
npm start       # plain node
```

The server listens on **port 3000**. `GET /` returns `Todo API is alive` as a health check.

## API

### Auth

All auth routes are public.

#### `POST /auth/register`

```json
{ "email": "me@example.com", "password": "hunter2" }
```

`201` → `{ "id": "...", "email": "me@example.com" }`

#### `POST /auth/login`

```json
{ "email": "me@example.com", "password": "hunter2" }
```

`200` → `{ "id": "...", "email": "me@example.com", "token": "eyJhbGci..." }`

`401` on a bad email or password — the same generic `Invalid credentials` message either way, so the endpoint doesn't leak which emails are registered.

### Tasks

Every `/tasks` route requires a valid token:

```
Authorization: Bearer <token>
```

Missing or malformed header → `401 No token provided`. Expired or invalid token → `401 Invalid or expired token`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/tasks` | List your non-deleted tasks |
| `POST` | `/tasks` | Create a task |
| `GET` | `/tasks/:id` | Fetch one task |
| `PUT` | `/tasks/:id` | Update allowed fields |
| `DELETE` | `/tasks/:id` | Soft-delete a task |

Responses follow a consistent envelope:

```json
{ "success": true, "data": { ... } }
```

```json
{ "success": false, "message": "Task not found" }
```

#### Task shape

| Field | Type | Notes |
|---|---|---|
| `title` | String | required, trimmed |
| `date` | String | defaults to `null` |
| `done` | Boolean | defaults to `false` |
| `effort` | String | `low` \| `mid` \| `high`, defaults to `low` |
| `goalId` | String | defaults to `null` |
| `createdAt` / `updatedAt` | Date | added by Mongoose timestamps |

`PUT` accepts only `title`, `date`, `done`, `effort`, and `goalId`. A body with none
of those returns `400 No valid fields to update`.

#### Status codes

| Code | When |
|---|---|
| `400` | Validation failure, bad ObjectId format, or no valid fields to update |
| `401` | Missing, invalid, or expired token |
| `404` | Task doesn't exist, is soft-deleted, or belongs to another user |
| `500` | Unexpected server error |

A task belonging to someone else returns `404`, not `403` — the API never confirms
that another user's task exists.

## Example

```bash
# register
curl -X POST localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"hunter2"}'

# log in and grab the token
TOKEN=$(curl -s -X POST localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"hunter2"}' | jq -r .token)

# create a task
curl -X POST localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Write the README","effort":"mid"}'

# list tasks
curl localhost:3000/tasks -H "Authorization: Bearer $TOKEN"
```

## Project structure

```
server.js                  # app setup, CORS, Mongo connection, route mounting
routes/
  auth.js                  # register + login
  tasks.js                 # task CRUD, all behind verifyToken
models/
  User.js                  # email + hashed password
  Task.js                  # task schema, soft delete, JSON transform
middleware/
  verifyToken.js           # Bearer token check, sets req.userId
```

## Notes

- `.env` is gitignored; `.env.example` documents the variables it needs.
- `POST /auth/register` signs a token but doesn't return it — clients call `/auth/login` after registering.
- No test suite yet; `npm test` is still the npm placeholder.
