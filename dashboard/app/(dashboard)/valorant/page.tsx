import { db } from "@/lib/db";
import { valorantLinks } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crosshair } from "lucide-react";

export const dynamic = "force-dynamic";

async function getData() {
  const accounts = await db.select().from(valorantLinks).orderBy(desc(valorantLinks.linkedAt));
  return accounts;
}

const REGION_COLORS: Record<string, string> = {
  eu: "text-blue-400",
  na: "text-red-400",
  ap: "text-yellow-400",
  kr: "text-pink-400",
  br: "text-green-400",
  latam: "text-orange-400",
};

export default async function ValorantPage() {
  const accounts = await getData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Valorant</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Comptes Riot liés aux membres Discord</p>
      </div>

      {/* Stat card */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-400/10">
                <Crosshair className="h-4 w-4 text-red-400" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground">{accounts.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Comptes liés</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">joueurs enregistrés</p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts list */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">Comptes liés</CardTitle>
            <Badge variant="secondary">{accounts.length} compte{accounts.length !== 1 ? "s" : ""}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Aucun compte Valorant lié. Les membres peuvent utiliser{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">/valorant link</code>{" "}
              pour lier leur compte.
            </p>
          ) : (
            <div className="space-y-1">
              {accounts.map((account) => (
                <div
                  key={`${account.discordUserId}-${account.guildId}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Crosshair className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-mono text-sm font-medium text-foreground">{account.riotId}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {account.region && (
                      <span className={`text-xs font-semibold uppercase ${REGION_COLORS[account.region.toLowerCase()] ?? "text-muted-foreground"}`}>
                        {account.region.toUpperCase()}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(account.linkedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
