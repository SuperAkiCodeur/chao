import { PageShell, SectionCard } from "@/components/PageShell";
import { ExternalLink, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

const WP_API = "https://agencemediapalestine.fr/wp-json/wp/v2/posts";

type WpPost = {
  id:      number;
  link:    string;
  title:   { rendered: string };
  excerpt: { rendered: string };
  date:    string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/gi, (e) => {
      const map: Record<string, string> = {
        "&amp;": "&", "&lt;": "<", "&gt;": ">",
        "&quot;": '"', "&#039;": "'", "&nbsp;": " ",
      };
      return map[e] ?? e;
    })
    .trim();
}

async function fetchPosts(): Promise<WpPost[]> {
  try {
    const res = await fetch(
      `${WP_API}?per_page=10&_fields=id,link,title,excerpt,date`,
      { next: { revalidate: 1800 } },
    );
    if (!res.ok) return [];
    return res.json() as Promise<WpPost[]>;
  } catch {
    return [];
  }
}

function nextPost9h(): string {
  const now = new Date();
  const paris = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const target = new Date(paris);
  target.setHours(9, 0, 0, 0);
  if (paris >= target) target.setDate(target.getDate() + 1);
  const diffMs = target.getTime() - paris.getTime();
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  return h > 0 ? `dans ${h}h ${m}min` : `dans ${m}min`;
}

export default async function PalestinePage() {
  const posts = await fetchPosts();
  const countdown = nextPost9h();

  return (
    <PageShell title="Palestine" description="Veille quotidienne — un article posté chaque matin à 9h (Paris)">

      {/* Info */}
      <div className="anim-scale-in" style={{
        display: "flex", alignItems: "center", gap: 10,
        alignSelf: "flex-start",
        background: "rgba(0,151,54,0.10)", border: "1px solid rgba(0,151,54,0.22)",
        borderRadius: 8, padding: "8px 16px",
      }}>
        <Clock size={13} style={{ color: "#4ade80", flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.60)" }}>
          Prochain article&nbsp;
          <span style={{ color: "#4ade80", fontWeight: 600 }}>{countdown}</span>
          &nbsp;· source&nbsp;
          <a href="https://agencemediapalestine.fr" target="_blank" rel="noreferrer"
            style={{ color: "rgba(255,255,255,0.55)", textDecoration: "underline", textUnderlineOffset: 3 }}>
            Agence Média Palestine
          </a>
        </span>
      </div>

      {/* Articles */}
      <SectionCard
        title="Articles récents"
        badge={posts.length > 0 ? `${posts.length} articles` : undefined}
        noPadding
      >
        {posts.length === 0 ? (
          <p style={{ padding: 20, fontSize: 14, color: "rgba(255,255,255,0.28)", fontStyle: "italic", textAlign: "center" }}>
            Impossible de récupérer les articles.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {posts.map((post, i) => {
              const title   = stripHtml(post.title.rendered);
              const excerpt = stripHtml(post.excerpt.rendered).slice(0, 200);
              const date    = new Date(post.date);
              return (
                <div key={post.id} style={{
                  padding: "16px 20px",
                  borderTop: i > 0 ? "1px solid rgba(255,255,255,0.08)" : undefined,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a href={post.link} target="_blank" rel="noreferrer"
                        className="hover-slide"
                        style={{ fontSize: 14, fontWeight: 600, color: "#fff", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}
                      >
                        {title}
                        <ExternalLink size={11} style={{ flexShrink: 0, opacity: 0.4 }} />
                      </a>
                      {excerpt && (
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", marginTop: 5, lineHeight: 1.6 }}>
                          {excerpt}{excerpt.length === 200 ? " […]" : ""}
                        </p>
                      )}
                    </div>
                    <span style={{
                      fontSize: 11, color: "rgba(255,255,255,0.30)",
                      flexShrink: 0, marginTop: 2, whiteSpace: "nowrap",
                    }}>
                      {date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

    </PageShell>
  );
}
