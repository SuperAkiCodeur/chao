import { db } from "@/lib/db";
import { dashboardLogs } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const TYPE_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "muted" | "destructive" }> = {
  cemantix:   { label: "Cémantix",   variant: "default" },
  watch:      { label: "Watch",      variant: "secondary" },
  valorant:   { label: "Valorant",   variant: "destructive" },
  member:     { label: "Membre",     variant: "success" },
  moderation: { label: "Modération", variant: "warning" },
};

function formatRelative(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

function formatFull(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

async function getData() {
  return db.select().from(dashboardLogs).orderBy(desc(dashboardLogs.id)).limit(100);
}

export default async function LogsPage() {
  const logs = await getData();

  // Group by date
  const groups = new Map<string, typeof logs>();
  for (const log of logs) {
    const day = new Date(log.createdAt).toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(log);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Historique des événements du serveur et du dashboard</p>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Aucun événement enregistré pour l'instant.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Les événements apparaîtront ici au fur et à mesure de l'activité du bot et du dashboard.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([day, entries]) => (
            <div key={day}>
              {/* Day separator */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground capitalize">{day}</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-foreground">
                      {entries.length} événement{entries.length > 1 ? "s" : ""}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {entries.map((log) => {
                      const config = TYPE_CONFIG[log.type] ?? { label: log.type, variant: "muted" as const };
                      return (
                        <div
                          key={log.id}
                          className="flex items-start justify-between gap-4 rounded-lg px-3 py-2.5 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <Badge variant={config.variant} className="shrink-0 mt-px">
                              {config.label}
                            </Badge>
                            <span className="text-sm text-foreground leading-snug">{log.description}</span>
                          </div>
                          <span
                            className="text-xs text-muted-foreground shrink-0 mt-0.5"
                            title={formatFull(log.createdAt)}
                          >
                            {formatRelative(log.createdAt)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
