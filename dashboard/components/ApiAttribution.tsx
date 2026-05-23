export function ApiAttribution({ name, url, description }: {
  name: string;
  url: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground/60 pt-1">
      <span className="h-px flex-1 bg-border" />
      <span>
        Propulsé par{" "}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          {name}
        </a>
        {" "}— {description}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
