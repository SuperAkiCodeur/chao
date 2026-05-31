"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { dashboardLogs } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function deleteLog(id: number): Promise<void> {
  await db.delete(dashboardLogs).where(eq(dashboardLogs.id, id));
  revalidatePath("/logs");
}
