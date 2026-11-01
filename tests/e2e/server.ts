// Local E2E server: serves the Vercel-style /api handlers in-process and
// proxies everything else to the Vite dev server, so Playwright can drive the
// real frontend against the real API + a fresh test database.
import http from "node:http";
import path from "node:path";
import { config } from "dotenv";

config({ path: ".env.test", override: true });

const API_PORT = Number(process.env.E2E_PORT ?? 8090);
const VITE_ORIGIN = process.env.E2E_VITE_ORIGIN ?? "http://localhost:8080";

type Handler = (req: any, res: any) => unknown;

// Exact routes, then [param] patterns (single dynamic segment).
const EXACT: Record<string, string> = {
  "/api/auth/register": "auth/register.ts",
  "/api/auth/login": "auth/login.ts",
  "/api/auth/logout": "auth/logout.ts",
  "/api/auth/me": "auth/me.ts",
  "/api/auth/change-password": "auth/change-password.ts",
  "/api/categories": "categories.ts",
  "/api/settings": "settings.ts",
  "/api/profile": "profile.ts",
  "/api/products": "products/index.ts",
  "/api/orders": "orders/index.ts",
  "/api/admin/stats": "admin/stats.ts",
  "/api/admin/settings": "admin/settings.ts",
  "/api/admin/products": "admin/products/index.ts",
  "/api/admin/orders": "admin/orders/index.ts",
  "/api/admin/customers": "admin/customers/index.ts",
};

const PATTERNS: { re: RegExp; file: string; param: string }[] = [
  { re: /^\/api\/products\/([^/]+)$/, file: "products/[slug].ts", param: "slug" },
  { re: /^\/api\/orders\/([^/]+)\/cancel$/, file: "orders/[id]/cancel.ts", param: "id" },
  { re: /^\/api\/orders\/([^/]+)$/, file: "orders/[id].ts", param: "id" },
  { re: /^\/api\/admin\/products\/([^/]+)$/, file: "admin/products/[id].ts", param: "id" },
  { re: /^\/api\/admin\/orders\/([^/]+)$/, file: "admin/orders/[id].ts", param: "id" },
  { re: /^\/api\/admin\/customers\/([^/]+)$/, file: "admin/customers/[id].ts", param: "id" },
];

// Vercel merges dynamic route segments into req.query; mirror that here.
function resolveHandler(pathname: string): { file: string; params: Record<string, string> } | null {
  if (EXACT[pathname]) return { file: EXACT[pathname], params: {} };
  for (const p of PATTERNS) {
    const m = p.re.exec(pathname);
    if (m) return { file: p.file, params: { [p.param]: decodeURIComponent(m[1]!) } };
  }
  return null;
}

const handlerCache = new Map<string, Handler>();
async function loadHandler(file: string): Promise<Handler> {
  let h = handlerCache.get(file);
  if (!h) {
    const mod = await import(path.resolve(process.cwd(), "api", file));
    h = (mod.default ?? mod) as Handler;
    handlerCache.set(file, h);
  }
  return h;
}

function readBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(undefined);
      }
    });
  });
}

function shimRes(res: http.ServerResponse) {
  const r = res as any;
  r.status = (code: number) => {
    res.statusCode = code;
    return r;
  };
  r.json = (data: unknown) => {
    if (!res.hasHeader("content-type")) res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(data));
    return r;
  };
  return r;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${API_PORT}`);
  const route = resolveHandler(url.pathname);

  if (url.pathname.startsWith("/api/")) {
    if (!route) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { code: "NOT_FOUND", message: "Unknown API route" } }));
      return;
    }
    try {
      const handler = await loadHandler(route.file);
      const body = await readBody(req);
      const query: Record<string, string> = { ...route.params };
      url.searchParams.forEach((v, k) => (query[k] = v));
      const shimmedReq = Object.assign(req, { body, query }) as any;
      await handler(shimmedReq, shimRes(res));
    } catch (err) {
      console.error("E2E API error", url.pathname, err);
      if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { code: "INTERNAL", message: "E2E server error" } }));
    }
    return;
  }

  // Proxy everything else to the Vite dev server.
  const proxy = http.request(
    `${VITE_ORIGIN}${req.url}`,
    { method: req.method, headers: { ...req.headers, host: new URL(VITE_ORIGIN).host } },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  proxy.on("error", () => {
    res.writeHead(502);
    res.end("Vite dev server unreachable");
  });
  req.pipe(proxy);
});

async function main() {
  const { resetTestDb } = await import("../../db/reset-test-db");
  await resetTestDb();
  server.listen(API_PORT, () => {
    console.log(`E2E server on http://localhost:${API_PORT} (proxying to ${VITE_ORIGIN})`);
  });
}

void main();
