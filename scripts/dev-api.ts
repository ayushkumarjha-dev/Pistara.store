// Local development API server: serves /api/* from the Vercel-style handlers
// in ../api against the database in .env, and proxies page requests to the
// Vite dev server (npm run dev, port 8080).
//
// Usage:
//   terminal 1: npm run dev        (Vite on :8080)
//   terminal 2: npm run dev:api    (API + proxy on :8090)
//   browser:    http://localhost:8090
process.env.E2E_ENV_FILE = process.env.E2E_ENV_FILE ?? ".env";

await import("../tests/e2e/server");
