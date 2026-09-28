import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, error, isAllowed, noStore, sameOrigin, toBackend } from "../_desk";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ path: string[] }> };

async function relay(req: NextRequest, ctx: Ctx, method: string) {
  const { path } = await ctx.params;
  const joined = path.join("/");
  if (!isAllowed(method, joined)) return error(404, "Not found.");
  // State changes must come from this site's own pages (defence in depth:
  // the SameSite=Strict cookie and the backend's CSRF token check also apply).
  if (method !== "GET" && !sameOrigin(req)) return error(403, "Refresh the page and try again.");

  let body: unknown = undefined;
  if (method !== "GET") {
    const text = await req.text();
    if (text.length > 20000) return error(413, "That's too long.");
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      return error(400, "Refresh the page and try again.");
    }
  }

  let upstream: Response;
  try {
    upstream = await toBackend(req, method, joined, body);
  } catch {
    return error(503, "Can't reach the Chintan server right now. Try again in a minute.");
  }
  const data = await upstream.json().catch(() => ({}));
  if (joined === "me" && upstream.status === 401) {
    // "Who am I?" while signed out is a normal answer, not an error.
    const res = noStore(NextResponse.json({ signed_in: false }));
    clearSessionCookie(res);
    return res;
  }
  if (upstream.status === 404 && joined === "me") {
    // The backend hides the Desk entirely when it isn't configured.
    return error(503, "The Desk isn't switched on for this server yet.");
  }
  const res = noStore(NextResponse.json(data, { status: upstream.status }));
  if (upstream.status === 401 || (joined === "logout-all" && upstream.ok)) clearSessionCookie(res);
  return res;
}

export function GET(req: NextRequest, ctx: Ctx) {
  return relay(req, ctx, "GET");
}
export function POST(req: NextRequest, ctx: Ctx) {
  return relay(req, ctx, "POST");
}
export function PATCH(req: NextRequest, ctx: Ctx) {
  return relay(req, ctx, "PATCH");
}
