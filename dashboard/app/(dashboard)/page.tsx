import { PageShell } from "@/components/PageShell";

export const dynamic = "force-dynamic";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

async function getBotStatus(): Promise<"online" | "offline"> {
  try {
    const res = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
      cache: "no-store",
    });
    return res.ok ? "online" : "offline";
  } catch {
    return "offline";
  }
}

export default async function HomePage() {
  const status = await getBotStatus();
  const isOnline = status === "online";

  return (
    <PageShell title="Dashboard">
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "80px 20px",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          background: "#202020", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14, padding: "24px 32px",
        }}>
          {/* Pulsing dot */}
          <div style={{ position: "relative", width: 12, height: 12, flexShrink: 0 }}>
            <span style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: isOnline ? "#4ade80" : "#ef4444",
              animation: isOnline ? "pulse-soft 2.4s ease-in-out infinite" : undefined,
            }} />
            <span style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: isOnline ? "#4ade80" : "#ef4444",
            }} />
          </div>
          <span style={{
            fontSize: 28, fontWeight: 400, color: "#fff",
            fontFamily: "var(--font-serif)",
          }}>
            Bot {isOnline ? "en ligne" : "hors ligne"}
          </span>
        </div>
      </div>
    </PageShell>
  );
}
