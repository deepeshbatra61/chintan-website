import { headers } from "next/headers";
import DeskApp from "./DeskApp";

// Rendered per request, so each response carries its own CSP nonce (see
// middleware.ts). Nothing sensitive is rendered here: the app loads its data
// through /admin/api after it checks the session.
export const dynamic = "force-dynamic";

export default async function DeskPage() {
  await headers();
  return <DeskApp />;
}
