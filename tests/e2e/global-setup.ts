import { config } from "dotenv";

config({ path: ".env.test", override: true });

const PORT = Number(process.env.E2E_PORT ?? 8090);

/**
 * Warm the dev servers before any test runs. The first SSR request after a
 * cold `vite dev` start occasionally loses the race against on-demand module
 * compilation and lands in the root error boundary ("This page didn't load"),
 * which then fails the first test of the suite even though the app is fine.
 * Render the home page once here so that compile cost is paid outside tests.
 */
export default async function globalSetup() {
  const deadline = Date.now() + 30_000;
  for (;;) {
    try {
      const res = await fetch(`http://localhost:${PORT}/`);
      if (res.ok) return;
    } catch {
      // Server not answering yet — retried below until the deadline.
    }
    if (Date.now() > deadline) {
      throw new Error(`E2E servers did not warm up at http://localhost:${PORT}/`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
