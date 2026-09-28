import type { MetadataRoute } from "next";

// Everything public is crawlable; the Desk is not (it also sends
// X-Robots-Tag: noindex, and its page metadata says the same).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin"] }],
  };
}
