import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import OpenInApp from "./OpenInApp";

const API = "https://chintangithubio-production.up.railway.app/api";

type Article = {
  article_id: string;
  title: string;
  what?: string;
  description?: string;
  source?: string;
  category?: string;
  image_url?: string;
  published_at?: string;
  url?: string;
};

// Uses /preview, NOT /articles/<id>: the latter lazily summarises with Claude on
// first open, and every link-preview crawler that touches a shared URL would
// fire a paid API call for a page nobody has opened yet.
async function getArticle(id: string): Promise<Article | null> {
  try {
    const res = await fetch(`${API}/articles/${id}/preview`, {
      // Shared links get hit repeatedly by crawlers and group chats; an hour of
      // caching keeps that off the backend without the page going stale in any
      // way a reader would notice.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Article;
  } catch {
    return null;
  }
}

function summaryOf(a: Article): string {
  return (a.what || a.description || "").trim();
}

// This is the whole point of the page existing. A shared link previously 404'd,
// so WhatsApp had nothing to unfurl and the message arrived as a bare grey URL.
// Real per-article OpenGraph tags are what turn a forwarded link into something
// someone actually taps.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticle(id);
  if (!article) {
    return { title: "Story not found — Chintan" };
  }

  const summary = summaryOf(article);
  const description = summary
    ? summary.slice(0, 200)
    : "Read this story on Chintan — don't just consume, contemplate.";

  return {
    title: `${article.title} — Chintan`,
    description,
    openGraph: {
      title: article.title,
      description,
      url: `https://chintan.news/article/${article.article_id}`,
      siteName: "Chintan",
      type: "article",
      locale: "en_IN",
      ...(article.image_url ? { images: [{ url: article.image_url }] } : {}),
    },
    twitter: {
      card: article.image_url ? "summary_large_image" : "summary",
      title: article.title,
      description,
      ...(article.image_url ? { images: [article.image_url] } : {}),
    },
  };
}

export default async function SharedArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticle(id);
  if (!article) notFound();

  const summary = summaryOf(article);
  const published = article.published_at
    ? new Date(article.published_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <>
      <Nav />
      <main className="shared-article">
        <span className="eyebrow">Shared with you</span>

        <h1>{article.title}</h1>

        <p className="shared-article__meta">
          {[article.category, article.source, published].filter(Boolean).join(" · ")}
        </p>

        {article.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="shared-article__image" src={article.image_url} alt="" />
        )}

        {summary && <p className="shared-article__summary">{summary}</p>}

        {/* Handled client-side: tries the app first, falls through to the store.
            Server-rendered content above stays intact either way. */}
        <OpenInApp articleId={article.article_id} />

        {article.url && (
          <p className="shared-article__source">
            Chintan summarises; it doesn&apos;t republish. Read the full story at{" "}
            <a href={article.url} target="_blank" rel="noopener noreferrer">
              {article.source || "the original publisher"}
            </a>
            .
          </p>
        )}
      </main>
      <Footer />
    </>
  );
}
