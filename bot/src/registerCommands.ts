import { registerCommands } from "./core/discord/registerCommands.js";

async function main(): Promise<void> {
  await registerCommands();
  console.log("[registerCommands] done");
}

main().catch((error) => {
  console.error("[registerCommands] failed", error);
});