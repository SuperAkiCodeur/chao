"use client";

const BD = "1px solid rgba(255,255,255,0.08)";

type Game = {
  id: number; steamAppId: number; title: string; headerImage: string | null;
  addedByName: string; isOnSale: number;
  lastKnownPriceEur: number | null; lastKnownDiscount: number | null;
};

function formatEur(cents: number) { return `${(cents / 100).toFixed(2)} €`; }

export function DealsClient({ channelId, channelName, notifChannelName, games }: {
  channelId: string;
  channelName: string;
  notifChannelName: string | null;
  games: Game[];
}) {
  const onSale = games.filter((g) => g.isOnSale === 1);

  return (
    <div className="card-glow anim-fade-up" style={{ background: "#202020", borderRadius: 12, border: BD, overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: games.length > 0 ? BD : undefined, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 20, fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)" }}>
            #{channelName}
          </p>
          {notifChannelName && (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", marginTop: 3 }}>
              📢 Notifs → #{notifChannelName}
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onSale.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.12)", padding: "3px 10px", borderRadius: 99 }}>
              🔥 {onSale.length} en promo
            </span>
          )}
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", background: "rgba(255,255,255,0.06)", padding: "3px 10px", borderRadius: 99 }}>
            {games.length} jeu{games.length !== 1 ? "x" : ""}
          </span>
        </div>
      </div>

      {/* Jeux */}
      {games.map((g, i) => {
        const priceStr = g.lastKnownPriceEur !== null
          ? g.isOnSale === 1
            ? `En promo — ${formatEur(g.lastKnownPriceEur)} (-${g.lastKnownDiscount ?? 0}%)`
            : formatEur(g.lastKnownPriceEur)
          : "Prix non vérifié";

        return (
          <div key={g.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 20px",
            borderTop: i > 0 ? BD : undefined,
          }}>
            {g.headerImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.headerImage} alt={g.title} style={{ width: 56, height: 34, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 56, height: 34, borderRadius: 6, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <a
                href={`https://store.steampowered.com/app/${g.steamAppId}`}
                target="_blank" rel="noreferrer"
                style={{ fontSize: 19, fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)", textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {g.title}
              </a>
              <p style={{ fontSize: 12, color: g.isOnSale === 1 ? "#4ade80" : "rgba(255,255,255,0.38)", marginTop: 2 }}>
                {priceStr}
              </p>
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", flexShrink: 0 }}>{g.addedByName}</span>
          </div>
        );
      })}

    </div>
  );
}
