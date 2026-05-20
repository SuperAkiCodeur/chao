import "dotenv/config";
import { createBot } from "./bot.js";

const bot = createBot();

await bot.start();