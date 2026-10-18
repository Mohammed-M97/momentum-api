# Momentum API

The backend for **Momentum**, a personal todo/task manager with goals.
A REST API built with Express 5 and MongoDB (Mongoose).
Users register and log in, receive a JWT, and every task and goal route is scoped to the
authenticated user — you can only ever see and modify your own data.

## Features

- **Email + password auth** — passwords hashed with bcrypt via a Mongoose `pre("save")` hook, so plaintext never reaches the database.
- **Registration switch** — sign-up is closed unless `ALLOW_REGISTER=true`, so a deployed instance can stay private.
- **JWT sessions** — tokens signed with `JWT_SECRET`, valid for 1 hour, sent as `Authorization: Bearer <token>`.
- **Tasks and goals** — tasks can be linked to a goal via `goalId`; deleting a goal either unlinks or deletes its tasks.
- **Per-user isolation** — `verifyToken` puts the user id on the request, and every task and goal query filters by `user: req.userId`.
- **Soft deletes** — `DELETE` sets a `deletedAt` timestamp instead of removing the document; all reads filter on `deletedAt: null`, so nothing is ever lost.
- **Whitelisted updates** — `POST` and `PUT` only apply fields from an explicit allow-list, so clients cannot overwrite `user`, `deletedAt`, or anything else internal.
- **Clean JSON output** — a `toJSON` transform renames `_id` to `id` and strips `__v` and the internal `user` field.
- **CORS from env** — the allowed origin comes from `CORS_ORIGIN` (required), and preflight responses are cached for 24h (`maxAge`) to cut down on `OPTIONS` requests.
- **Demo mode** — `POST /auth/demo` creates a throwaway user pre-filled with sample goals and tasks, so visitors can try the app without signing up. Demo accounts expire after 2 hours.
- **Demo protection** — demo sessions are rate-limited (5 per hour per IP), capped at 200 active at once, and can be switched off entirely with `ALLOW_DEMO`.
- **Demo cleanup script** — `npm run cleanup:demo` deletes expired demo users together with their goals and tasks.
- **Safer user model** — emails are stored lowercased and trimmed, the password hash is never returned (`select: false` + `toJSON` transform), and task dates must be `YYYY-MM-DD`.

## Tech stack

| | |
|---|---|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | MongoDB via Mongoose |
| Auth | jsonwebtoken + bcrypt |
| Rate limiting | express-rate-limit |
| Dev | nodemon, dotenv |

## Getting started

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

```
MONGO_URI=mongodb://localhost:27017/momentum
JWT_SECRET=some-long-random-string
CORS_ORIGIN=http://localhost:5173
ALLOW_REGISTER=true
ALLOW_DEMO=true
PORT=3000
HOST=127.0.0.1
```

- `JWT_SECRET` is required — the server throws on startup if it is missing.
- `ALLOW_REGISTER` must be exactly `true` for `POST /auth/register` to work. Leave it unset (or anything else) to close registration; existing users can still log in.
- `CORS_ORIGIN` is required — the frontend URL allowed to call the API. The server throws on startup if it is missing.
- `ALLOW_DEMO` must be exactly `true` for `POST /auth/demo` to work.
- `PORT` and `HOST` are optional and default to `3000` and `127.0.0.1`.

```bash
npm run dev     # nodemon, auto-restart
npm start       # plain node
```

The server listens on `HOST:PORT` (**127.0.0.1:3000** by default). `GET /` returns `Momentum API is alive` as a health check.

## API

All JSON responses use the same envelope:

```json
{ "success": true, "data": { ... } }
```

```json
{ "success": false, "message": "Task not found" }
```

### Auth

All auth routes are public.

#### `POST /auth/register`

```json
{ "email": "me@example.com", "password": "hunter2" }
```

`201` →

```json
{
  "success": true,
  "data": { "id": "...", "email": "me@example.com", "token": "eyJhbGci..." }
}
```

Registering logs you in — the response already carries a token, so there is no need
to call `/auth/login` right after.

If `ALLOW_REGISTER` is not `true` → `403 Registration is closed`.
If the email is already taken → `409 Email already registered`.

#### `POST /auth/login`

```json
{ "email": "me@example.com", "password": "hunter2" }
```

`200` →

```json
{
  "success": true,
  "data": { "id": "...", "email": "me@example.com", "token": "eyJhbGci..." }
}
```

A bad email and a bad password both return the same `401` → `{ "success": false, "message": "Invalid credentials" }`, so login doesn't leak which emails are registered.

#### `POST /auth/demo`

Starts a demo session — no email or password needed. The body is optional:

```json
{ "tz": "Asia/Riyadh" }
```

`tz` is an IANA time zone used to place the sample tasks on the right days (last week,
this week, today, upcoming). An invalid or missing value falls back to `Asia/Riyadh`.

`201` →

```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "demo-<uuid>@demo.local",
    "token": "eyJhbGci...",
    "expiresAt": "2026-10-18T14:00:00.000Z"
  }
}
```

What happens behind the scenes:

1. A demo user is created with a random email and password, flagged `isDemo: true` and an `expiresAt` 2 hours from now.
2. Sample data from [demo/sampleData.js](demo/sampleData.js) is inserted: 3 goals and a spread of tasks linked to them.
3. A JWT valid for 2 hours is returned, so the client can use the normal `/tasks` and `/goals` routes right away.

If anything fails half-way, the partly-created user, goals, and tasks are removed.

| Response | When |
|---|---|
| `403 Demo is disabled` | `ALLOW_DEMO` is not `true` |
| `429 Too many demo sessions, try later` | More than 5 demo sessions from the same IP within an hour (uses `CF-Connecting-IP` when behind Cloudflare) |
| `503 Demo is busy, try later` | 200 demo accounts are already active |

#### Cleaning up expired demo users

Demo accounts are not deleted automatically when they expire. Run:

```bash
npm run cleanup:demo
```

It connects using `MONGO_URI` from `.env`, finds demo users whose `expiresAt` has passed,
and permanently deletes them along with their goals and tasks. Schedule it (e.g. a cron
job every hour) on a deployed instance.

### Authentication

Every `/tasks` and `/goals` route requires a valid token:

```
Authorization: Bearer <token>
```

Missing or malformed header → `401 No token provided`. Expired or invalid token → `401 Invalid or expired token`.

### Tasks

| Method | Path | Description |
|---|---|---|
| `GET` | `/tasks` | List your non-deleted tasks, sorted by `date` ascending, then newest first |
| `POST` | `/tasks` | Create a task |
| `GET` | `/tasks/:id` | Fetch one task |
| `PUT` | `/tasks/:id` | Update allowed fields |
| `DELETE` | `/tasks/:id` | Soft-delete a task |

#### Task shape

| Field | Type | Notes |
|---|---|---|
| `title` | String | required, trimmed |
| `date` | String | `YYYY-MM-DD`, defaults to `null` |
| `done` | Boolean | defaults to `false` |
| `effort` | String | `low` \| `mid` \| `high`, defaults to `low` |
| `goalId` | String | id of a goal, defaults to `null` |
| `createdAt` / `updatedAt` | Date | added by Mongoose timestamps |

`POST` and `PUT` accept only `title`, `date`, `done`, `effort`, and `goalId`. A `PUT`
body with none of those returns `400 No valid fields to update`.

### Goals

| Method | Path | Description |
|---|---|---|
| `GET` | `/goals` | List your non-deleted goals, newest first |
| `POST` | `/goals` | Create a goal |
| `GET` | `/goals/:id` | Fetch one goal |
| `PUT` | `/goals/:id` | Update allowed fields |
| `DELETE` | `/goals/:id?tasks=unlink\|delete` | Soft-delete a goal and handle its tasks |

#### Goal shape

| Field | Type | Notes |
|---|---|---|
| `title` | String | required, trimmed |
| `why` | String | defaults to `""` |
| `status` | String | `active` \| `paused` \| `done`, defaults to `active` |
| `targetDate` | String | defaults to `null` |
| `categoryId` | String | defaults to `null` |
| `createdAt` / `updatedAt` | Date | added by Mongoose timestamps |

`POST` and `PUT` accept only `title`, `why`, `status`, `targetDate`, and `categoryId`.
A `PUT` body with none of those returns `400 No valid fields to update`.

#### Deleting a goal

The `tasks` query parameter decides what happens to the goal's tasks:

| Value | Effect |
|---|---|
| `unlink` (default) | Tasks are kept; their `goalId` is set to `null` |
| `delete` | Tasks are soft-deleted along with the goal |

Any other value returns `400`. The response includes how many tasks were changed:

```json
{
  "success": true,
  "message": "Goal successfully deleted",
  "data": { ... },
  "tasksAffected": 3
}
```

### Status codes

| Code | When |
|---|---|
| `400` | Invalid JSON body, validation failure, bad ObjectId format, no valid fields to update, or bad `tasks` value on goal delete |
| `401` | Missing, invalid, or expired token; or wrong login credentials |
| `403` | Registration is closed (`ALLOW_REGISTER` not `true`) or demo is disabled (`ALLOW_DEMO` not `true`) |
| `404` | Task or goal doesn't exist, is soft-deleted, or belongs to another user |
| `409` | Email already registered |
| `429` | Too many demo sessions from the same IP |
| `500` | Unexpected server error |
| `503` | Demo user cap reached |

A task or goal belonging to someone else returns `404`, not `403` — the API never confirms
that another user's data exists.

## Example

```bash
# or skip sign-up and start a demo session (requires ALLOW_DEMO=true)
# TOKEN=$(curl -s -X POST localhost:3000/auth/demo -H "Content-Type: application/json" #   -d '{"tz":"Asia/Riyadh"}' | jq -r .data.token)

# register (requires ALLOW_REGISTER=true)
curl -X POST localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"hunter2"}'

# log in and grab the token
TOKEN=$(curl -s -X POST localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"hunter2"}' | jq -r .data.token)

# create a goal and grab its id
GOAL=$(curl -s -X POST localhost:3000/goals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Ship v1","why":"Get it in front of users"}' | jq -r .data.id)

# create a task linked to the goal
curl -X POST localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"title\":\"Write the README\",\"effort\":\"mid\",\"goalId\":\"$GOAL\"}"

# list tasks
curl localhost:3000/tasks -H "Authorization: Bearer $TOKEN"

# delete the goal and its tasks
curl -X DELETE "localhost:3000/goals/$GOAL?tasks=delete" -H "Authorization: Bearer $TOKEN"
```

## Project structure

```
server.js                  # app setup, CORS, Mongo connection, route mounting, error handler
routes/
  auth.js                  # register, login, demo sessions
  tasks.js                 # task CRUD, all behind verifyToken
  goals.js                 # goal CRUD, all behind verifyToken
models/
  User.js                  # email + hashed password, demo flag + expiry
  Task.js                  # task schema, soft delete, JSON transform
  Goal.js                  # goal schema, soft delete, JSON transform
middleware/
  verifyToken.js           # Bearer token check, sets req.userId
demo/
  sampleData.js            # builds the sample goals/tasks for demo users, relative to today
scripts/
  cleanup-demo.js          # deletes expired demo users and their data (npm run cleanup:demo)
```

## Notes

- `.env` is gitignored; `.env.example` documents the variables it needs.
- `POST /auth/register` returns a token alongside the new user, so a client can go straight from sign-up to authenticated requests.
- No test suite yet; `npm test` is still the npm placeholder.

## License

[MIT](LICENSE)
