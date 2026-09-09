"use client";

import { useEffect, useState } from "react";

const PLAY_STORE = "https://play.google.com/store/apps/details?id=com.chintan.app";

/**
 * The call to action on a shared story.
 *
 * Note what this deliberately does NOT do: auto-redirect. On Android with the
 * App Link verified, the app intercepts chintan.news/article/<id> before this
 * page ever loads -- so anyone actually reading this either doesn't have the
 * app, or their device didn't verify the link. Bouncing them straight to a
 * store page would mean a friend's recommendation vanishing into an install
 * prompt before they'd read a word of it. The story is the pitch; the button
 * comes after.
 */
export default function OpenInApp({ articleId }: { articleId: string }) {
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    setIsAndroid(/android/i.test(navigator.userAgent));
  }, []);

  return (
    <div className="shared-article__cta">
      <a className="shared-article__cta-primary" href={PLAY_STORE}>
        {isAndroid ? "Open in Chintan" : "Get Chintan"}
      </a>
      <p className="shared-article__cta-note">
        Three briefs a day instead of an endless feed. Free, and there&apos;s no
        infinite scroll to fall into.
      </p>
    </div>
  );
}
