# IronLog

A full-stack fitness tracking application for strength athletes. Log workouts, track progress over time, view per-exercise trends, and calculate one-rep maxes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | [Express 5](https://expressjs.com/) (TypeScript) |
| **Frontend** | [React 19](https://react.dev/) + [Wouter](https://github.com/molefrog/wouter) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) via [Drizzle ORM](https://orm.drizzle.team/) |
| **Validation** | [Zod](https://zod.dev/) (auto-generated from OpenAPI spec via [Orval](https://orval.dev/)) |
| **Auth** | Session-based (express-session + PostgreSQL store + bcrypt) |
| **API Client** | [TanStack React Query](https://tanstack.com/query) with auto-generated hooks |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (Radix UI) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Build** | [Vite](https://vitejs.dev/) (frontend) · [esbuild](https://esbuild.github.io/) (backend) |
| **Monorepo** | [pnpm workspaces](https://pnpm.io/workspaces) |

---

## Prerequisites

- **Node.js** >= 18
- **pnpm** >= 9 (`npm install -g pnpm`)
- **PostgreSQL** >= 14 (running locally or a hosted instance)

---

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

**Backend** (`artifacts/api-server/.env`):

```env
DATABASE_URL=postgres://user:password@localhost:5432/ironlog
SESSION_SECRET=a-long-random-secret-string
NODE_ENV=development
PORT=8000

# Optional — restrict CORS to a specific origin in production.
# Defaults to reflecting the request origin (any origin allowed) when unset.
CORS_ORIGIN=http://localhost:3000
```

**Frontend** (`artifacts/ironlog/.env`):

```env
PORT=3000
# BASE_PATH=/ (optional, defaults to /)
```

### 3. Create and migrate the database

```bash
# Push the Drizzle schema to your PostgreSQL instance
pnpm -C lib/db push
```

### 4. Run in development

Open two terminals:

```bash
# Terminal 1 — backend API server
pnpm -C artifacts/api-server dev

# Terminal 2 — frontend Vite dev server
pnpm -C artifacts/ironlog dev
```

The API is available at `http://localhost:8000/api` and the UI at `http://localhost:3000`.

---

## Project Structure

```
IronLog/
├── artifacts/
│   ├── api-server/          # Express.js backend
│   │   ├── src/
│   │   │   ├── app.ts                  # Express app factory (middleware, session, CORS)
│   │   │   ├── index.ts                # Entry point — reads PORT, starts HTTP server
│   │   │   ├── lib/
│   │   │   │   └── logger.ts           # Pino logger (pretty in dev, JSON in prod)
│   │   │   ├── middleware/
│   │   │   │   └── require-auth.ts     # Shared session auth guard + SessionData typing
│   │   │   ├── routes/
│   │   │   │   ├── index.ts            # Aggregates all routers
│   │   │   │   ├── health.ts           # GET /api/healthz
│   │   │   │   ├── auth.ts             # POST /signup /login /logout, GET /me
│   │   │   │   ├── workouts.ts         # CRUD for workouts
│   │   │   │   └── stats.ts            # Dashboard, progress, last-exercise, quote
│   │   │   ├── __mocks__/
│   │   │   │   └── db.ts               # Manual Jest mock for @workspace/db
│   │   │   └── test-utils/
│   │   │       └── create-test-app.ts  # Lightweight Express app for supertest
│   │   ├── jest.config.cjs             # Jest configuration (ESM + ts-jest)
│   │   ├── build.mjs                   # esbuild bundler script
│   │   └── package.json
│   │
│   └── ironlog/             # React frontend
│       ├── src/
│       │   ├── App.tsx                  # Router, QueryClientProvider, ProtectedRoute
│       │   ├── main.tsx                 # React DOM entry
│       │   ├── components/
│       │   │   ├── layout.tsx           # Sidebar navigation + main content shell
│       │   │   └── ui/                  # shadcn/ui component library
│       │   ├── pages/
│       │   │   ├── login.tsx            # Login / signup toggle form
│       │   │   ├── dashboard.tsx        # Stats overview + recent workouts
│       │   │   ├── workout-new.tsx      # Workout logging with previous-session reference
│       │   │   ├── history.tsx          # Paginated collapsible workout history
│       │   │   ├── progress.tsx         # Per-exercise line charts (top weight & volume)
│       │   │   ├── calculator.tsx       # 1RM calculator (Epley, Brzycki, Lombardi)
│       │   │   └── not-found.tsx        # 404 page
│       │   ├── hooks/
│       │   │   └── use-toast.ts         # Toast notification system
│       │   └── lib/
│       │       ├── exercises.ts         # PRESET_EXERCISES list
│       │       └── utils.ts             # cn() tailwind class merger
│       └── package.json
│
├── lib/
│   ├── db/                  # Database layer
│   │   ├── src/
│   │   │   ├── index.ts                # Drizzle + pg Pool initialisation + exports
│   │   │   └── schema/
│   │   │       ├── users.ts            # users table
│   │   │       ├── workouts.ts         # workouts table
│   │   │       └── workoutSets.ts      # workout_sets table
│   │   └── drizzle.config.ts
│   │
│   ├── api-spec/            # OpenAPI source of truth
│   │   ├── openapi.yaml                # Full API spec (OpenAPI 3.1.0)
│   │   └── orval.config.ts             # Code generation config (-> api-zod, api-client-react)
│   │
│   ├── api-zod/             # Auto-generated Zod request/response schemas
│   │   └── src/generated/api.ts
│   │
│   └── api-client-react/    # Auto-generated React Query hooks
│       └── src/
│           ├── generated/api.ts        # useListWorkouts, useCreateWorkout, etc.
│           ├── generated/api.schemas.ts # TypeScript interfaces
│           └── custom-fetch.ts         # Fetch wrapper (base URL, credentials, error classes)
│
├── scripts/                 # Shared build/utility scripts
├── pnpm-workspace.yaml      # Workspace + catalog dependency versions
├── package.json             # Root scripts (build, typecheck)
└── tsconfig.json            # TypeScript project references
```

---

## Database Schema

```
users
  id            serial PRIMARY KEY
  email         text UNIQUE NOT NULL
  password_hash text NOT NULL
  created_at    timestamp NOT NULL DEFAULT now()

workouts
  id         serial PRIMARY KEY
  user_id    integer NOT NULL -> users.id (CASCADE DELETE)
  date       date NOT NULL
  notes      text
  created_at timestamp NOT NULL DEFAULT now()

workout_sets
  id            serial PRIMARY KEY
  workout_id    integer NOT NULL -> workouts.id (CASCADE DELETE)
  exercise_name text NOT NULL
  weight        real NOT NULL     -- in pounds
  reps          integer NOT NULL
  rpe           real              -- Rate of Perceived Exertion (optional, 1-10)
  created_at    timestamp NOT NULL DEFAULT now()
```

---

## API Reference

All routes are prefixed with `/api`. Request bodies must use `Content-Type: application/json`. Authentication is session-based; send requests with `credentials: "include"` so the session cookie is included.

### Health

#### `GET /api/healthz`

No authentication required.

**Response 200**
```json
{ "status": "ok" }
```

---

### Auth

#### `POST /api/auth/signup`

Creates a new account and starts a session.

**Request body**
```json
{ "email": "user@example.com", "password": "secret123" }
```
`password` must be at least 6 characters.

**Response 201**
```json
{ "id": 1, "email": "user@example.com" }
```

**Errors**: `400` Invalid input · `409` Email already registered

---

#### `POST /api/auth/login`

Authenticates with existing credentials and starts a session.

**Request body**
```json
{ "email": "user@example.com", "password": "secret123" }
```

**Response 200**
```json
{ "id": 1, "email": "user@example.com" }
```

**Errors**: `400` Invalid input · `401` Invalid credentials

---

#### `POST /api/auth/logout`

Destroys the current session.

**Response 200**
```json
{ "ok": true }
```

---

#### `GET /api/auth/me`

Returns the currently authenticated user. Requires an active session.

**Response 200**
```json
{ "id": 1, "email": "user@example.com" }
```

**Errors**: `401` Not authenticated

---

### Workouts

All workout routes require authentication.

#### `GET /api/workouts`

Lists the authenticated user's workouts, newest first.

**Query params**

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | number | 20 | Max results to return |
| `offset` | number | 0 | Results to skip (for pagination) |

**Response 200** — Array of workout objects:
```json
[
  {
    "id": 1,
    "userId": 1,
    "date": "2024-01-15",
    "notes": "Felt strong today",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "sets": [
      {
        "id": 10,
        "workoutId": 1,
        "exerciseName": "Squat",
        "weight": 100,
        "reps": 5,
        "rpe": 8,
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "totalVolume": 500,
    "exerciseCount": 1
  }
]
```

---

#### `POST /api/workouts`

Creates a new workout with all its sets in one request.

**Request body**
```json
{
  "date": "2024-01-15",
  "notes": "Optional notes",
  "sets": [
    { "exerciseName": "Squat", "weight": 100, "reps": 5, "rpe": 8 },
    { "exerciseName": "Squat", "weight": 100, "reps": 5 }
  ]
}
```
`rpe` and `notes` are optional.

**Response 201** — Same shape as a single workout in the list response, including computed `totalVolume` and `exerciseCount`.

**Errors**: `400` Invalid input · `401` Not authenticated

---

#### `GET /api/workouts/:id`

Fetches a single workout by ID. Returns 404 if the workout belongs to a different user.

**Response 200** — Single workout object (same shape as list item).

**Errors**: `400` Invalid id · `401` Not authenticated · `404` Not found

---

#### `DELETE /api/workouts/:id`

Deletes a workout and all its sets (via cascade). Returns 404 if the workout belongs to a different user.

**Response 204** — No content.

**Errors**: `400` Invalid id · `401` Not authenticated · `404` Not found

---

### Stats

All stats routes require authentication unless noted.

#### `GET /api/stats/dashboard`

Returns summary statistics for the authenticated user's training history.

**Response 200**
```json
{
  "weeklyWorkoutCount": 3,
  "totalWorkouts": 42,
  "weeklyVolume": 15000,
  "allTimeVolume": 210000,
  "recentWorkouts": []
}
```
`recentWorkouts` contains the 5 most recent workouts in full workout-object format.

---

#### `GET /api/stats/progress?exercise=Squat`

Returns per-workout top weight and total volume for a given exercise, ordered chronologically for charting.

**Query params**

| Param | Type | Required | Description |
|---|---|---|---|
| `exercise` | string | yes | Exact exercise name (case-sensitive) |

**Response 200**
```json
{
  "data": [
    { "workoutDate": "2024-01-10", "topWeight": 120, "totalVolume": 600 },
    { "workoutDate": "2024-01-17", "topWeight": 125, "totalVolume": 750 }
  ]
}
```

**Errors**: `400` Missing exercise param · `401` Not authenticated

---

#### `GET /api/stats/last-exercise?exercise=Squat`

Returns all sets from the most recent workout that included a given exercise. Used to pre-fill the new workout form with previous performance data.

**Query params**

| Param | Type | Required | Description |
|---|---|---|---|
| `exercise` | string | yes | Exact exercise name (case-sensitive) |

**Response 200**
```json
{
  "workoutDate": "2024-01-15",
  "sets": [
    { "id": 10, "exerciseName": "Squat", "weight": 100, "reps": 5, "rpe": 8 },
    { "id": 11, "exerciseName": "Squat", "weight": 100, "reps": 5, "rpe": null }
  ]
}
```

Returns `{ "workoutDate": null, "sets": [] }` when no history exists for the exercise.

**Errors**: `400` Missing exercise param · `401` Not authenticated

---

#### `GET /api/stats/quote`

Returns a motivational quote. Does not require authentication. Attempts to fetch from [ZenQuotes](https://zenquotes.io/) with a 3-second timeout; falls back to a built-in collection on failure.

**Response 200**
```json
{ "text": "No pain, no gain.", "author": "Unknown" }
```

---

## Running Tests

```bash
# From the repo root
pnpm -C artifacts/api-server test
```

Tests use [Jest](https://jestjs.io/) with [ts-jest](https://kulshekhar.github.io/ts-jest/) and [supertest](https://github.com/ladjs/supertest). The database is fully mocked — no real PostgreSQL connection is needed to run the test suite.

---

## Code Generation

The Zod schemas in `lib/api-zod` and the React Query hooks in `lib/api-client-react` are auto-generated from `lib/api-spec/openapi.yaml`. After changing the OpenAPI spec, regenerate with:

```bash
pnpm -C lib/api-spec codegen
```

---

## Building for Production

```bash
# Typecheck + build all packages
pnpm build

# Or build each artifact individually:
pnpm -C artifacts/api-server build   # -> artifacts/api-server/dist/index.mjs
pnpm -C artifacts/ironlog build      # -> artifacts/ironlog/dist/public/
```

Set `NODE_ENV=production` and `CORS_ORIGIN=https://your-frontend-domain.com` when running the compiled backend.

---

## Security Notes

- Passwords are hashed with **bcrypt** at cost factor 12.
- Sessions are stored server-side in PostgreSQL (30-day expiry, `httpOnly`, `Secure` in production, `SameSite=Lax`).
- All SQL queries use **parameterised placeholders** (`$1`, `$2`) to prevent injection.
- Auth error messages are **identical** for missing users and wrong passwords to prevent user enumeration.
- Set `CORS_ORIGIN` in production to restrict credentialed cross-origin requests to known origins.
- Consider adding **rate limiting** (e.g. `express-rate-limit`) to `/api/auth/signup` and `/api/auth/login` before deploying publicly.
