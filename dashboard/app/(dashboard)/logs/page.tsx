import { db } from "@/lib/db";
import { dashboardLogs } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { LogsClient } from "./LogsClient";
import { PageShell } from "@/components/PageShell";

export const dynamic = "force-dynamic";

async function getData() {
  return db.select().from(dashboardLogs).orderBy(desc(dashboardLogs.id)).limit(100);
}

export default async function LogsPage() {
  const logs = await getData();

  return (
    <PageShell title="Logs" description="Historique des événements du serveur et du dashboard">
      <LogsClient logs={logs} />
    </PageShell>
  );
}
