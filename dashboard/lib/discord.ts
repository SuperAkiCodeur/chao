const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

export function discordHeaders() {
  return { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" };
}
