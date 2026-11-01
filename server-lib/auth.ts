import { SignJWT, jwtVerify } from "jose";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export const SESSION_COOKIE = "pistara_session";
const SESSION_DAYS = 7;

export interface SessionPayload {
  sub: string; // user id
  role: "customer" | "admin";
  email: string;
}

let cachedKey: CryptoKey | null = null;

async function secretKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must be set (32+ chars)");
  // WebCrypto CryptoKey works with jose's webapi build in every realm (Vercel Node, vitest).
  cachedKey = await crypto.subtle.importKey(
    "raw",
    Buffer.from(secret, "utf8"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return cachedKey;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(await secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, await secretKey());
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      role: payload.role === "admin" ? "admin" : "customer",
      email: String(payload.email ?? ""),
    };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function readSessionToken(req: VercelRequest): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === SESSION_COOKIE) return rest.join("=") || null;
  }
  return null;
}

export async function getSession(req: VercelRequest): Promise<SessionPayload | null> {
  const token = readSessionToken(req);
  if (!token) return null;
  return verifySession(token);
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export async function requireUser(req: VercelRequest): Promise<SessionPayload> {
  const session = await getSession(req);
  if (!session) throw new HttpError(401, "UNAUTHENTICATED", "Please sign in to continue");
  return session;
}

export async function requireAdmin(req: VercelRequest): Promise<SessionPayload> {
  const session = await requireUser(req);
  if (session.role !== "admin") throw new HttpError(403, "FORBIDDEN", "Admin access required");
  return session;
}

export function setSessionCookie(res: VercelResponse, token: string): void {
  res.setHeader("Set-Cookie", sessionCookie(token));
}

export function clearSession(res: VercelResponse): void {
  res.setHeader("Set-Cookie", clearSessionCookie());
}
