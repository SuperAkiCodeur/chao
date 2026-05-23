import { db } from "@/lib/db";
import { valorantLinks } from "@/lib/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

async function getData() {
  const accounts = await db.select().from(valorantLinks).orderBy(valorantLinks.linkedAt);
  return accounts;
}

export default async function ValorantPage() {
  const accounts = await getData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Valorant</h1>
        <p className="text-muted-foreground">Comptes Riot liés aux membres Discord</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comptes liés</CardTitle>
          <CardDescription>{accounts.length} compte{accounts.length !== 1 ? "s" : ""} enregistré{accounts.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun compte Valorant lié. Les membres peuvent utiliser{" "}
              <code className="rounded bg-muted px-1 text-xs">/valorant link</code> pour lier leur compte.
            </p>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => (
                <div
                  key={`${account.discordUserId}-${account.guildId}`}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm"
                >
                  <div className="space-y-0.5">
                    <p className="font-mono font-medium">{account.riotId}</p>
                    <p className="text-xs text-muted-foreground">
                      Discord : <span className="font-mono">{account.discordUserId}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {account.region && (
                      <Badge variant="outline">{account.region.toUpperCase()}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(account.linkedAt).toLocaleDateString("fr-FR")}
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
