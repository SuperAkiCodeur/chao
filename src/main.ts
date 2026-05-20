import "dotenv/config";
import { createBot } from "./bot.js";

async function bootstrap(): Promise<void> {
  try {
    console.log("[bootstrap] creating bot");
    const bot = createBot();

    console.log("[bootstrap] starting bot");
    await bot.start();

    console.log("[bootstrap] bot.start() resolved");
  } catch (error) {
    console.error("[bootstrap] failed to start bot", error);
    process.exit(1);
  }
}

void bootstrap();