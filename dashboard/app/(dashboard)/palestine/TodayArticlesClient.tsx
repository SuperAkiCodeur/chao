"use client";

import { useState } from "react";
import { ArrowSquareOut, PaperPlaneTilt, Check, WarningCircle } from "@phosphor-icons/react";
import { SectionCard } from "@/components/PageShell";
import { postArticleNow } from "./actions";

export type TodayArticle = {
  id:          number;
  title:       string;
  url:         string;
  description: string;
  date:        string;
};

type Status = "idle" | "pending" | "success" | "error";

export function TodayArticlesClient({ articles }: { articles: TodayArticle[] }) {
  const [statuses, setStatuses] = useState<Record<number, Status>>({});
  const [errors,   setErrors]   = useState<Record<number, string>>({});

  async function handlePost(article: TodayArticle) {
    setStatuses((s) => ({ ...s, [article.id]: "pending" }));
    const result = await postArticleNow({
      title:       article.title,
      url:         article.url,
      description: article.description,
      date:        article.date,
    });
    if (result.success) {
      setStatuses((s) => ({ ...s, [article.id]: "success" }));
    } else {
      setStatuses((s) => ({ ...s, [article.id]: "error" }));
      setErrors((e) => ({ ...e, [article.id]: result.error }));
    }
  }

  return (
    <SectionCard
      title="Derniers articles"
      badge={articles.length > 0 ? `${articles.length} article${articles.length !== 1 ? "s" : ""}` : undefined}
      noPadding
    >
      {articles.length === 0 ? (
        <p style={{ padding: 20, fontSize: 14, color: "rgba(255,255,255,0.28)", fontStyle: "italic", textAlign: "center" }}>
          Aucun article disponible.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {articles.map((article, i) => {
            const status  = statuses[article.id] ?? "idle";
            const error   = errors[article.id];
            const excerpt = article.description.slice(0, 180);
            const date    = new Date(article.date);

            return (
              <div key={article.id} style={{
                padding: "14px 20px",
                borderTop: i > 0 ? "1px solid rgba(255,255,255,0.08)" : undefined,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover-slide"
                      style={{
                        fontSize: 19, fontWeight: 400, color: "#fff",
                        fontFamily: "var(--font-serif)",
                        textDecoration: "none",
                        display: "inline-flex", alignItems: "center", gap: 6,
                      }}
                    >
                      {article.title}
                      <ArrowSquareOut size={11} style={{ flexShrink: 0, opacity: 0.4 }} />
                    </a>
                    {excerpt && (
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", marginTop: 4, lineHeight: 1.55 }}>
                        {excerpt}{article.description.length > 180 ? " […]" : ""}
                      </p>
                    )}
                    {status === "error" && error && (
                      <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{error}</p>
                    )}
                  </div>

                  {/* Right: date + button */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", whiteSpace: "nowrap" }}>
                      {date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>

                    {status === "success" ? (
                      <span style={{
                        display: "flex", alignItems: "center", gap: 5,
                        fontSize: 12, fontWeight: 600, color: "#4ade80",
                        padding: "5px 10px", borderRadius: 7,
                        background: "rgba(74,222,128,0.10)",
                        border: "1px solid rgba(74,222,128,0.20)",
                      }}>
                        <Check size={12} />
                        Posté
                      </span>
                    ) : status === "error" ? (
                      <button
                        onClick={() => handlePost(article)}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          fontSize: 12, fontWeight: 600, color: "#ef4444",
                          padding: "5px 10px", borderRadius: 7,
                          background: "rgba(239,68,68,0.10)",
                          border: "1px solid rgba(239,68,68,0.20)",
                          cursor: "pointer",
                        }}
                      >
                        <WarningCircle size={12} />
                        Réessayer
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePost(article)}
                        disabled={status === "pending"}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          fontSize: 12, fontWeight: 600, color: "#fff",
                          padding: "5px 10px", borderRadius: 7,
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.14)",
                          cursor: status === "pending" ? "not-allowed" : "pointer",
                          opacity: status === "pending" ? 0.55 : 1,
                          transition: "opacity 0.15s",
                        }}
                      >
                        <PaperPlaneTilt size={11} />
                        {status === "pending" ? "Envoi…" : "Poster"}
                      </button>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
