import { db } from "./client.js";
import { dashboardLogs } from "./schema.js";

/**
 * Insère une entrée lisible dans les logs du dashboard.
 * Ne lève jamais d'exception — une erreur de log ne doit pas crasher le bot.
 */
export async function insertLog(params: {
  type: "cinema" | "member" | "moderation" | "deals";
  action: string;
  description: string;
  userId?: string | null;
  userName?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(dashboardLogs).values({
      type: params.type,
      action: params.action,
      description: params.description,
      userId: params.userId ?? null,
      userName: params.userName ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[logger] Failed to insert log entry:", err);
  }
}
