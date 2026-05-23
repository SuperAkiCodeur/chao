import "dotenv/config";
import { createBot } from "./bot.js";

async function bootstrap(): Promise<void> {
  try {
    const bot = createBot();
    await bot.start();
  } catch (error) {
    console.error("[bootstrap] failed to start bot", error);
    process.exit(1);
  }
}

void bootstrap();