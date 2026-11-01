import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ZodError, type ZodSchema } from "zod";
import { HttpError } from "./auth";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface HandlerOptions<B = unknown> {
  methods: Method[];
  body?: ZodSchema<B>;
  handler: (ctx: {
    req: VercelRequest;
    res: VercelResponse;
    body: B;
    query: Record<string, string | string[] | undefined>;
  }) => Promise<unknown>;
}

function zodDetails(err: ZodError) {
  return err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

/**
 * Wraps a Vercel serverless handler: method guard, Zod body validation,
 * consistent { data } / { error: { code, message, details? } } JSON shapes.
 */
export function handler<B = unknown>(opts: HandlerOptions<B>) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      if (!opts.methods.includes(req.method as Method)) {
        res.setHeader("Allow", opts.methods.join(", "));
        return res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" } });
      }
      let body = req.body as B;
      if (opts.body && req.method !== "GET" && req.method !== "DELETE") {
        body = opts.body.parse(req.body ?? {});
      }
      const data = await opts.handler({ req, res, body, query: req.query });
      if (!res.writableEnded) {
        if (data === undefined) return res.status(204).end();
        return res.status(200).json({ data });
      }
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "Invalid input", details: zodDetails(err) },
        });
      }
      if (err instanceof HttpError) {
        return res.status(err.status).json({
          error: { code: err.code, message: err.message, details: err.details },
        });
      }
      console.error(err);
      return res.status(500).json({ error: { code: "INTERNAL", message: "Something went wrong" } });
    }
  };
}

export { HttpError };
