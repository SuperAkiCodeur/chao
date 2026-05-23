import { db } from "./db";
import { dashboardLogs } from "./schema";

export async function addLog(params: {
  type: "cemantix" | "watch" | "valorant" | "member" | "moderation";
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
    console.error("[logger] Failed to insert log:", err);
  }
}
