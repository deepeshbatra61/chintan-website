import { NextRequest, NextResponse } from "next/server";
import { error, noStore, sameOrigin, setSessionCookie, toBackend } from "../_desk";

export const dynamic = "force-dynamic";

// The session token goes into an HttpOnly cookie and never into the page;
// the page gets only the CSRF token it must echo on changes.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return error(403, "Refresh the page and try again.");
  let body: { email?: unknown; password?: unknown; code?: unknown };
  try {
    body = await req.json();
  } catch {
    return error(400, "Refresh the page and try again.");
  }
  const payload = {
    email: String(body.email ?? "").slice(0, 254),
    password: String(body.password ?? "").slice(0, 256),
    code: String(body.code ?? "").slice(0, 12),
  };
  let upstream: Response;
  try {
    upstream = await toBackend(req, "POST", "login", payload);
  } catch {
    return error(503, "Can't reach the Chintan server right now. Try again in a minute.");
  }
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok || !data.token) {
    const status = upstream.status === 429 ? 429 : upstream.status === 404 ? 503 : 401;
    const detail = status === 503 ? "The Desk isn't switched on for this server yet." : data.detail || "Incorrect email, password or code.";
    return error(status, detail);
  }
  const res = noStore(NextResponse.json({ email: data.email, csrf: data.csrf, alert_failed: !!data.alert_failed }));
  setSessionCookie(res, data.token);
  return res;
}
