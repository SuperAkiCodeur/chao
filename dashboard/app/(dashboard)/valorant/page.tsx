import { db } from "@/lib/db";
import { valorantLinks } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crosshair } from "lucide-react";
import { ValorantClient } from "./ValorantClient";

export const dynamic = "force-dynamic";

const DEFAULT_GUILD_ID = process.env.DISCORD_GUILD_ID ?? "";

async function getData() {
  return db.select().from(valorantLinks).orderBy(desc(valorantLinks.linkedAt));
}

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
          <ValorantClient accounts={accounts} defaultGuildId={DEFAULT_GUILD_ID} />
        </CardContent>
      </Card>
    </div>
  );
}
