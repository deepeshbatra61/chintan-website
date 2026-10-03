"use client";

import { useEffect, useState } from "react";

const PACKAGE = "com.chintan.app";
const PLAY_STORE = `https://play.google.com/store/apps/details?id=${PACKAGE}`;

/**
 * The call to action on a shared story.
 *
 * Android: an intent:// link that names our package. It opens the installed
 * app straight on this story whether or not the phone verified the App Link
 * (an unverified link, or one tapped inside an app's built-in browser, is
 * exactly how a reader ends up on this page with the app installed). If the
 * app isn't installed, Chrome follows browser_fallback_url to the Play Store.
 * This button used to point at the Play Store even for readers who had the
 * app, so "Open in Chintan" never opened Chintan.
 *
 * Still no auto-redirect: a reader without the app would be bounced to a store
 * page before reading a word of what their friend sent. The story is the
 * pitch; the button comes after.
 */
export default function OpenInApp({ articleId, compact = false }: { articleId: string; compact?: boolean }) {
  const [platform, setPlatform] = useState<"android" | "ios" | "other">("other");

  useEffect(() => {
    const ua = navigator.userAgent;
    setPlatform(/android/i.test(ua) ? "android" : /iphone|ipad|ipod/i.test(ua) ? "ios" : "other");
  }, []);

  const intentHref =
    `intent://www.chintan.news/article/${encodeURIComponent(articleId)}` +
    `#Intent;scheme=https;package=${PACKAGE};` +
    `S.browser_fallback_url=${encodeURIComponent(PLAY_STORE)};end`;

  // Top-of-page shortcut, Android only: most readers who land here with the
  // app installed want out of the browser before they scroll.
  if (compact) {
    if (platform !== "android") return null;
    return (
      <a className="shared-article__open-top" href={intentHref}>
        Open in the Chintan app ›
      </a>
    );
  }

  return (
    <div className="shared-article__cta">
      <a
        className="shared-article__cta-primary"
        href={platform === "android" ? intentHref : PLAY_STORE}
      >
        {platform === "android" ? "Open in Chintan" : "Get Chintan"}
      </a>
      <p className="shared-article__cta-note">
        Three briefs a day instead of an endless feed. Free, and there&apos;s no
        infinite scroll to fall into.
      </p>
    </div>
  );
}
