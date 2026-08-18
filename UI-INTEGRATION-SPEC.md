# Frontend ↔ Backend Integration — UI Spec

A screen-by-screen spec for wiring the Fieldbase dashboard (this Next.js app) to the real
NestJS backend instead of the mock/localStorage store. Use this as the prompt for the
implementation work.

---

## 0. Context

The backend owns all data. Its surface (see `docs/API-CONTRACT.md`, `docs/API.md` in the repo root):

- **Auth** — Better Auth at `/api/auth/*` on the backend origin: `sign-up/email`, `sign-in/email`,
  `get-session`, `sign-out`. Session cookies (HttpOnly); secure only in production. Email+password,
  no email verification. Password min length 8 (Better Auth default).
- **Management API** — session cookie **or** `Authorization: Bearer <project API key>`:
  - `GET|POST /projects`, `GET|PATCH|DELETE /projects/:projectId`
  - `GET|POST /projects/:projectId/collections`, `GET|PATCH|DELETE .../collections/:collectionId`
  - `GET|POST .../collections/:collectionId/fields`, `PATCH .../fields/reorder`, `PATCH|DELETE .../fields/:fieldId`
  - `GET|POST|DELETE .../collections/:collectionId/origins`
  - `GET|POST .../collections/:collectionId/submissions`, `GET|DELETE .../submissions/:submissionId`
  - `GET|POST|DELETE /projects/:projectId/api-keys`
- **Public ingestion** — `POST /v1/collect/:publicId` (no auth; this is what the "Connect it"
  snippet must target).

**Backend DTOs (what the API returns):**

```ts
ProjectDto      { id, name, website: string|null, createdAt, updatedAt }
CollectionDto   { id, projectId, publicId, name, description: string|null,
                  status: "ACTIVE"|"INACTIVE"|"ARCHIVED", createdAt, updatedAt }
FieldDto        { id, collectionId, name, label: string|null, type, required,
                  position, config: {options: string[]}|{min?,max?}|null, createdAt, updatedAt }
SubmissionDto   { id, collectionId, data: Record<string, unknown>, createdAt }
ApiKeyDto       { id, name, createdAt, lastUsedAt?, ... }   // secret shown once at creation
OriginDto       { origin, createdAt }
```

Field `type` enum (backend): `TEXT | EMAIL | PHONE | NUMBER | LONG_TEXT | SELECT |
MULTI_SELECT | CHECKBOX | DATE | URL`. Field `name` is the submission payload key (unique per
collection); `label` is display text (null ⇒ show `name`). SELECT/MULTI_SELECT config is
`{ options: string[] }`; NUMBER config is `{ min?, max? }`; all other types have `null` config.

Error envelope (all management + auth endpoints): `{ "error": { "code": "...", "message": "..." } }`
with proper HTTP status (400 VALIDATION_ERROR, 401, 404, 429, 503, ...).

**Dev topology:** backend on `http://localhost:3000`, this app on `http://localhost:3001`.
The backend env `DASHBOARD_URL` must be `http://localhost:3001` — that origin is the only one
that gets credentialed CORS and it is Better Auth's `trustedOrigins`. API calls are made
**directly from the browser** with `credentials: "include"` and `Origin` set by the browser.

**Implementation rules:**
- Read `frontend/former/AGENTS.md` and the bundled Next.js docs in `node_modules/next/dist/docs/`
  before writing framework code — this Next.js version has breaking changes vs. older training data.
- Keep the existing `lib/store.ts` interface (pages already call `useStore()`); replace the
  provider's implementation with API-backed calls so the page components change as little as possible.
- Add a typed API client (`lib/api/*`) with the error-envelope parsing; never show raw
  `{ error: {...} }` JSON to users — surface `message` via `sonner` toasts / inline errors.
- All pages/components stay client components ("use client").

---

## 1. New screens (do not exist today)

### 1.1 `/sign-in` — Sign in
**Purpose:** authenticate with email + password; redirect to `/` on success.
**Elements:** email, password, submit; link to `/sign-up`; inline error for wrong credentials.
**Backend:** `POST /api/auth/sign-in/email` `{ email, password }` with `credentials: "include"`.
On 401/400 show "Invalid email or password" (or the API message). On success call `get-session`
and load the store.
**Notes:** if already signed in, redirect away. Must work with the browser-sent `Origin`
(this app's origin is in `trustedOrigins`, so it will).

### 1.2 `/sign-up` — Create account
**Purpose:** create an account; auto sign-in if the backend signs in on sign-up (verify behavior).
**Elements:** name (optional), email, password (+ show min-8 requirement inline), submit; link to
`/sign-in`; inline error (e.g. `PASSWORD_TOO_SHORT`, email already registered).
**Backend:** `POST /api/auth/sign-up/email` `{ name?, email, password }` with
`credentials: "include"`. After success, if not auto-signed-in, call `sign-in/email`.
**Notes:** the backend has **no email verification** — say "Account created" immediately.

### 1.3 `/settings` — Account + API keys (currently a "Coming soon" placeholder)
**Purpose:** account info, sign out, and project API-key management.
**Elements:**
- Account section: email (read-only), sign-out button.
- Project picker + API keys section: list the selected project's API keys (`GET .../api-keys`),
  create a new key (`POST .../api-keys` `{ name }`) with a one-time reveal of the secret
  (`sk_...`), delete a key with confirmation. Show `lastUsedAt`/created date where available.
**Backend:** `GET|POST|DELETE /projects/:projectId/api-keys`.
**Notes:** the secret must be shown **once** at creation (copy-to-clipboard button), never stored
or re-fetchable. Warn that deleting a key breaks anything using it.

---

## 2. Existing screens — wire to the API (they exist, but are mock)

Every screen below currently renders `useStore()` mock data. Wiring = API-backed provider +
small page adjustments. Store data must be **joined**: collections do not embed fields; fetch
`fields` per collection and attach.

### 2.1 `/` — Projects list (exists)
**Changes:** data from API. **Remove the "Duplicate" action** (no backend endpoint; do not fake it).
Everything else (search, sort, rename, delete) maps 1:1: project `domain` ↔ backend `website`
(mapper converts both ways; `null` website ⇒ "No domain set").

### 2.2 `/projects/new` — New project (exists, 2-step wizard)
**Changes:** create via API; then if a template was chosen, create the template collection via
the collections + fields APIs (template fields must be translated to backend field shape — see
§3 mapping). Rename the "Website" label to match backend field `website`.

### 2.3 `/projects/[projectId]` — Project overview (exists)
**Changes:** stats/chart/recent lists from API. Archived badge maps from
`status === "ARCHIVED"` (or `"INACTIVE"` — decide: treat INACTIVE as active-but-paused or as a
third badge state). "Create collection" unchanged.

### 2.4 `/projects/[projectId]/collections` — Collections list (exists)
**Changes:** data from API; **remove Duplicate action**; archive/restore maps to
`status: ACTIVE ↔ ARCHIVED`. The `{n} fields` column needs the joined fields. Decide how to
display INACTIVE collections (new badge "Paused" or fold into archived filter).

### 2.5 `/projects/[projectId]/collections/new` — New collection builder (exists)
**Changes:** on submit, call `POST .../collections` then `POST .../fields` per field (in order —
`position` is assigned by creation order), then navigate to the new collection.
**Field builder constraints (from backend validation):** field `name` is a machine key unique per
collection (the UI currently uses `id` — the builder must generate/label this); SELECT/MULTI_SELECT
require `options` (1–100); NUMBER accepts min/max; label defaults to name when null.
See §3 for the field type mapping.

### 2.6 `/projects/[projectId]/collections/[collectionId]` — Collection detail (exists; biggest change)
**Changes:**
- **Submissions tab:** data from API (`data` ↔ `values`). Read/unread filter + mark-as-read need a
  decision — see §4. Delete submissions via `DELETE .../submissions/:id`.
- **Endpoint / "Connect it" snippet:** build from `publicId`:
  `POST /v1/collect/{publicId}`. The current hardcoded `https://api.fieldbase.dev/f/{id}` is
  fictional — replace with the real public endpoint (from env, e.g. `NEXT_PUBLIC_API_URL` +
  `/v1/collect/{publicId}`). Snippet field names = field `name`s, not ids.
- **Allowed origins (NEW section):** list `GET .../origins`, add `POST .../origins`
  `{ origin }`, remove `DELETE .../origins/:encodedOrigin`. Explain plainly: "Allow this exact
  website origin (e.g. `https://example.com`) to submit from a browser." Show the current page's
  origin hint to catch the localhost-vs-127.0.0.1 trap.
- **Settings tab:** general (name/description) via `PATCH .../collections/:id`; fields editor via
  the fields endpoints (including reorder); **remove or hide the Notifications/notifyEmail
  section** (backend has no such field — product promise, unimplemented); archive/restore maps to
  status; delete unchanged.
- Overview tab (stats, avg fields filled) maps onto the same joined data.

---

## 3. Field type mapping (frontend `Field` ↔ backend `FieldDto`)

| Frontend type | Backend type |
|---|---|
| `text`   | `TEXT`        |
| `email`  | `EMAIL`       |
| `phone`  | `PHONE`       |
| `number` | `NUMBER`      |
| `longtext` | `LONG_TEXT`  |
| `select` | `SELECT`      |
| `multiselect` | `MULTI_SELECT` |
| `checkbox` | `CHECKBOX`   |
| `date`   | `DATE`        |
| `url`    | `URL`         |

Other field property mapping:
- `options: string[]` ↔ `config: { options }` for SELECT/MULTI_SELECT only.
- `number` min/max (if the UI exposes them) ↔ `config: { min, max }`.
- `description`, `placeholder`, `defaultValue` on the frontend `Field` type **do not exist on the
  backend** — drop them from the UI (or keep in the frontend type as unused) rather than inventing
  API fields. Note this in the UI copy so it isn't a surprise.
- Frontend `field.id` (submission key today) becomes backend `field.name` + backend `field.id`
  (UUID). All submission display/table code keys on `name` after mapping.

## 4. Decisions required (surface to the user before/while implementing)

1. **Read/unread tracking** — the backend stores no `read` flag; the UI has unread filters/badges.
   Options: (a) drop unread UI for now, (b) keep it client-side only (localStorage), or
   (c) add `readAt` to the backend Submission model (Prisma migration — touches the backend, out
   of scope for a frontend-only pass). **Recommend (c) later, (a) or (b) now.**
2. **`INACTIVE` collection status** — the frontend only knows active/archived. Recommend mapping
   INACTIVE → its own "Paused" badge and excluding it from the public endpoint display.
3. **Duplicate project/collection actions** — remove from UI (no backend endpoint). Do not fake.
4. **Notifications (notifyEmail)** — remove/hide the section (backend has no field).

## 5. Out of scope (do not build)

- Public-facing form builder/embed widget (the product renders forms on the developer's site).
- Server-side rendering of backend data / Next server components or route handlers as a proxy —
  keep direct browser→API calls with credentialed CORS (matches the backend's security model).
- Any backend change except (optionally) the `readAt` migration in §4.1.
- Rate limiting UI, analytics beyond what exists, webhooks, email.

## 6. Acceptance criteria

- Fresh browser session: sign up → lands on empty projects → create project → create collection
  with fields → see the "Connect it" endpoint built from `publicId` → copy snippet → submit a
  real submission from a separate origin page → it appears in the dashboard → sign out → sign back
  in → data persists (proves the API, not localStorage).
- Credentialed calls work cross-origin (`credentials: "include"`; no CORS errors in the console).
- Backend errors show readable messages (never raw JSON envelopes).
- 401/session expiry routes to `/sign-in` without breaking the page.
- Frontend `typecheck`, `lint`, and `build` pass; backend test suite untouched and green.
