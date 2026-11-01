// In-process request/response helper for calling Vercel handlers in tests.
import { createMocks, type RequestMethod } from "node-mocks-http";
import type { VercelRequest, VercelResponse } from "@vercel/node";

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

export interface TestResponse {
  status: number;
  body: any;
  cookies: Record<string, string>;
  setCookieHeaders: string[];
}

export class CookieJar {
  private jar = new Map<string, string>();

  setFrom(setCookie: string[] | string | undefined) {
    const headers = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    for (const h of headers) {
      const [pair] = h.split(";");
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (/Max-Age=0/i.test(h) || value === "") this.jar.delete(name);
      else this.jar.set(name, value);
    }
  }

  header(): string | undefined {
    if (this.jar.size === 0) return undefined;
    return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

export async function call(
  handler: Handler,
  opts: {
    method?: RequestMethod;
    body?: unknown;
    query?: Record<string, string>;
    jar?: CookieJar;
    headers?: Record<string, string>;
  } = {},
): Promise<TestResponse> {
  const { req, res } = createMocks({
    method: opts.method ?? "GET",
    body: opts.body as any,
    query: opts.query,
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "127.0.0.1",
      ...(opts.jar?.header() ? { cookie: opts.jar.header() } : {}),
      ...opts.headers,
    },
  });

  await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);

  const setCookie = res.getHeader("set-cookie");
  const setCookieHeaders = Array.isArray(setCookie) ? setCookie.map(String) : setCookie ? [String(setCookie)] : [];
  opts.jar?.setFrom(setCookieHeaders);

  const cookies: Record<string, string> = {};
  for (const h of setCookieHeaders) {
    const [pair] = h.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) cookies[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }

  return {
    status: res._getStatusCode(),
    body: res._getJSONData(),
    cookies,
    setCookieHeaders,
  };
}
