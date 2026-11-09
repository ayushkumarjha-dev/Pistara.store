# PISTARA — Premium Dry Fruits Storefront

Full-stack storefront (React + TanStack Start) with a serverless backend on
**Vercel**, backed by **Turso (libSQL)** via **Drizzle ORM**, validated with
**Zod**, and consumed through **TanStack Query**.

- Serverless API handlers live in [`/api`](api) (one file per endpoint, nested paths).
- Shared Zod schemas: [`/shared/schemas.ts`](shared/schemas.ts).
- Auth/session/HTTP helpers: [`/server-lib`](server-lib).
- DB schema + migrations + seed: [`/db`](db).
- Tests: [`/tests`](tests) (Vitest unit + API, Playwright E2E).

## Quick start

```sh
npm i
cp .env.example .env            # fill in Turso URL/token + secrets
npm run db:push                 # apply schema to the DB in .env
npm run db:seed                 # seed categories, products, settings, admin
npm run dev                     # UI on http://localhost:8080 (Vite only)
npm run dev:api                 # API + UI proxy on http://localhost:8090
```

> `npm run dev` serves the React app only — API calls need `npm run dev:api`,
> which proxies to Vite and serves `/api` from your `.env` database.
> Browse the full stack at **http://localhost:8090**.

### Environment variables

| Variable                 | Purpose                                                      |
| ------------------------ | ------------------------------------------------------------ |
| `TURSO_DATABASE_URL`     | libSQL URL (`libsql://…` or `file:./…`)                      |
| `TURSO_AUTH_TOKEN`       | Turso auth token (empty for `file:` URLs)                    |
| `JWT_SECRET`             | HS256 secret for session cookies (`openssl rand -base64 32`) |
| `APP_URL`                | Public base URL (e.g. `http://localhost:8090`)               |
| `ADMIN_EMAIL`            | The single admin account (created by the seed)               |
| `ADMIN_INITIAL_PASSWORD` | Initial admin password (seed only)                           |
| `WHATSAPP_NUMBER`        | WhatsApp number for the floating button/order links          |

See [`.env.example`](.env.example). The test suite reads **`.env.test`**
([`.env.test.example`](.env.test.example)) and **refuses to run against any
database whose URL does not contain `test`** — use a separate Turso database
or `file:./pistara-test.db`.

## API

All endpoints return `{ data }` or `{ error: { code, message, details? } }`.

| Area    | Endpoints                                                                                                                                                                                                                                             |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth    | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`                                                                                                                      |
| Catalog | `GET /api/products`, `GET /api/products/:slug`, `GET /api/categories`, `GET /api/settings`                                                                                                                                                            |
| Profile | `GET/PUT /api/profile`                                                                                                                                                                                                                                |
| Orders  | `GET/POST /api/orders`, `GET /api/orders/:id`, `POST /api/orders/:id/cancel`                                                                                                                                                                          |
| Admin   | `GET /api/admin/stats`, `GET/POST /api/admin/products`, `PUT/PATCH/DELETE /api/admin/products/:id`, `GET /api/admin/orders`, `PATCH /api/admin/orders/:id`, `GET /api/admin/customers`, `GET /api/admin/customers/:id`, `GET/PUT /api/admin/settings` |

### Rules of the domain

- **Auth**: email + password only (bcryptjs cost 10–12). Session = signed JWT
  (jose, HS256, 7 days) in the `pistara_session` httpOnly cookie
  (SameSite=Lax, Secure in production). Exactly one admin, from `ADMIN_EMAIL`.
- **Money**: integer rupees (INR). Flat ₹50 delivery charge, stored in the
  `settings` table.
- **Stock**: stock is checked at order time but **not** deducted; it is
  deducted (inside a transaction, re-checked, `409` if insufficient) when an
  admin sets the order to `PAYMENT_CONFIRMED`. Cancellation restores stock only
  if it was deducted (`stock_deducted`).
- **Order statuses**: `PENDING → PAYMENT_CONFIRMED → PACKED → SHIPPED →
OUT_FOR_DELIVERY → DELIVERED`, plus `CANCELLED`. Customers may cancel while
  `PENDING`/`PAYMENT_CONFIRMED`/`PACKED`; admins may cancel any order except
  `DELIVERED`.

## Scripts

| Script                                                         | Description                                     |
| -------------------------------------------------------------- | ----------------------------------------------- |
| `npm run dev`                                                  | Vite dev server (UI only, :8080)                |
| `npm run dev:api`                                              | API + proxy with `.env` (:8090)                 |
| `npm run build`                                                | Production build (Vercel/nitro output)          |
| `npm run lint` / `npm run format`                              | ESLint / Prettier                               |
| `npm run db:generate` / `db:push` / `db:migrate` / `db:studio` | Drizzle workflow                                |
| `npm run db:seed`                                              | Seed baseline data                              |
| `npm run db:reset-test`                                        | Drop + re-seed the **test** DB (guarded)        |
| `npm test`                                                     | Unit + API + E2E                                |
| `npm run test:ci`                                              | Same as `test`, with coverage gate — used by CI |

## Testing

- **Vitest** — `tests/unit` (pure logic) and `tests/api` (handlers run against
  the test DB, reset between files). Coverage is measured on `/api` +
  `/server-lib` with an **80% line threshold** enforced by `vitest.config.ts`.
- **Playwright** — `tests/e2e`, 11 scenarios across admin, checkout and
  storefront. The config starts its own Vite server plus a dedicated API
  server bound to the test DB (`E2E_PORT`, default 8090; set e.g.
  `E2E_PORT=8091` when `dev:api` already holds 8090) and never reuses an
  already-running API server, so tests can't silently hit production.

```sh
npm run test:unit         # unit tests
npm run test:api          # API tests
npm run test:e2e          # Playwright (installs its own servers)
E2E_PORT=8091 npm run test:e2e   # when port 8090 is taken
```

## CI/CD

[`.github/workflows/ci.yml`](.github/workflows/ci.yml):

1. **test** — installs deps + Chromium, writes a guarded `file:./pistara-test.db`
   env, runs `npm run test:ci` (unit + API coverage gate + E2E), then
   `npm run build`. Runs on pushes and PRs to `master`.
2. **deploy** — `needs: test`, only on pushes to `master`: `vercel pull` →
   `vercel build` → `vercel deploy --prebuilt --prod`.

Deploy requires repository secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
`VERCEL_PROJECT_ID`. Vercel's own git integration deploys are disabled
(`git.deploymentEnabled: false` in `vercel.json`) so this workflow is the
only deploy path. Concurrency groups cancel superseded branch runs but never
interrupt a production deploy.

> Until the VERCEL_* secrets are configured in GitHub, pushes to `master` run
> tests + build only and production is not updated.

## Project layout

```
api/                  Vercel serverless handlers (nested = URL path)
  auth/               register, login, logout, me, change-password
  products/           index, [slug]
  orders/             index, [id], [id]/cancel
  admin/              stats, settings, products/, orders/, customers/
  categories.ts  settings.ts  profile.ts
db/                   Drizzle schema, migrations, seed, reset-test-db
server-lib/           auth (JWT), http, order-number, order-status,
                      rate-limit, whatsapp
shared/schemas.ts     Zod schemas shared by API + UI
src/                  TanStack Start app (routes, components, lib)
tests/                unit/, api/, e2e/, helpers/
```

Frontend state: cart is Zustand + localStorage (`variantId` + `quantity`);
session/roles come from `AuthProvider`; TanStack Query talks to `/api` through
[`src/lib/api-client.ts`](src/lib/api-client.ts) with the session cookie.

---

Built with [Lovable](https://lovable.dev) — this code is yours; changes
committed to the connected GitHub repo sync back into the editor.
