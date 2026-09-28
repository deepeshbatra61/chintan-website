import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, error, noStore, sameOrigin, toBackend } from "../_desk";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return error(403, "Refresh the page and try again.");
  try {
    await toBackend(req, "POST", "logout");     // revoke server-side; best effort
  } catch {
    // The cookie is cleared regardless; the server session also idles out in 30 min.
  }
  const res = noStore(NextResponse.json({ ok: true }));
  clearSessionCookie(res);
  return res;
}
