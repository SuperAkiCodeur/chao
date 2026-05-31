export function ApiAttribution({ name, url, description }: {
  name: string;
  url: string;
  description: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
      <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", whiteSpace: "nowrap" }}>
        Propulsé par{" "}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "rgba(255,255,255,0.50)", textDecoration: "underline", textUnderlineOffset: 2 }}
        >
          {name}
        </a>
        {" "}— {description}
      </span>
      <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
    </div>
  );
}
