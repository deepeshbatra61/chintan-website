// Server-only proxy from chintan.news/admin to the Desk API on Railway.
//
// The browser never talks to the backend and never sees the session token
// or the proxy secret:
//
//   browser ──(__Host-desk cookie, X-Desk-CSRF)──▶ /admin/api/* (here, on Vercel)
//            ──(X-Desk-Proxy, X-Desk-Session, X-Desk-CSRF, X-Desk-Client-IP)──▶ Railway
//
// Auth is enforced by the BACKEND on every call. Nothing here decides who is
// signed in; this layer only carries credentials, pins the cookie, checks the
// request came from this site (Origin), and refuses paths not on the list.

import "server-only";
import { NextRequest, NextResponse } from "next/server";

export const BACKEND = process.env.DESK_BACKEND_URL || "https://chintangithubio-production.up.railway.app/api";
export const COOKIE = "__Host-desk";
export const SESSION_MAX_AGE = 8 * 60 * 60;   // matches the backend's absolute session limit

const ID = "[A-Za-z0-9_-]{1,120}";
// Every backend route the Desk UI uses, and nothing else.
const ALLOWED: Array<[string, RegExp]> = [
  ["GET", new RegExp(`^me$`)],
  ["GET", new RegExp(`^items$`)],
  ["GET", new RegExp(`^drafts/${ID}$`)],
  ["POST", new RegExp(`^logout-all$`)],
  ["POST", new RegExp(`^check$`)],
  ["POST", new RegExp(`^drafts$`)],
  ["PATCH", new RegExp(`^drafts/${ID}$`)],
  ["POST", new RegExp(`^drafts/${ID}/(publish|discard)$`)],
  ["POST", new RegExp(`^boost$`)],
  ["POST", new RegExp(`^stories/${ID}/(end|extend)$`)],
  ["POST", new RegExp(`^articles/${ID}/unpublish$`)],
  ["POST", new RegExp(`^articles/${ID}/restore/${ID}$`)],
  ["GET", new RegExp(`^push$`)],
  ["POST", new RegExp(`^push/(enabled|test)$`)],
  ["POST", new RegExp(`^push/breaking/(preview|send)$`)],
  ["GET", new RegExp(`^newsroom$`)],
  ["GET", new RegExp(`^events/${ID}$`)],
  ["POST", new RegExp(`^events/${ID}/(promote|hide|merge|split)$`)],
  ["POST", new RegExp(`^events/${ID}/remove/${ID}$`)],
];

export function isAllowed(method: string, path: string): boolean {
  return ALLOWED.some(([m, re]) => m === method && re.test(path));
}

export function clientIp(req: NextRequest): string {
  // Vercel sets x-real-ip / x-forwarded-for from the connecting client and
  // overwrites anything the client sent, so on Vercel these are trustworthy.
  return (req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "").trim();
}

export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || new URL(req.url).protocol.replace(":", "");
  return origin === `${proto}://${host}`;
}

export function noStore(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

export function error(status: number, detail: string): NextResponse {
  return noStore(NextResponse.json({ detail }, { status }));
}

export async function toBackend(
  req: NextRequest,
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const secret = process.env.DESK_PROXY_SECRET;
  if (!secret) throw new Error("DESK_PROXY_SECRET is not set");
  const headers: Record<string, string> = {
    "x-desk-proxy": secret,
    "x-desk-client-ip": clientIp(req),
    "user-agent": (req.headers.get("user-agent") || "").slice(0, 300),
  };
  const token = req.cookies.get(COOKIE)?.value;
  if (token) headers["x-desk-session"] = token;
  const csrf = req.headers.get("x-desk-csrf");
  if (csrf) headers["x-desk-csrf"] = csrf;
  if (body !== undefined) headers["content-type"] = "application/json";
  return fetch(`${BACKEND}/desk/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0 });
}
