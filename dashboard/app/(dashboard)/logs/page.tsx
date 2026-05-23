import { db } from "@/lib/db";
import { dashboardLogs } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { LogsClient } from "./LogsClient";

export const dynamic = "force-dynamic";

async function getData() {
  return db.select().from(dashboardLogs).orderBy(desc(dashboardLogs.id)).limit(100);
}

export default async function LogsPage() {
  const logs = await getData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Historique des événements du serveur et du dashboard</p>
      </div>

      <LogsClient logs={logs} />
    </div>
  );
}
