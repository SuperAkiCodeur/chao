const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
export const GUILD_ID = process.env.DISCORD_GUILD_ID!;

export type DiscordChannel = { id: string; name: string; type: number; position: number; parent_id: string | null };
export type DiscordRole    = { id: string; name: string; color: number; position: number };
export type DiscordGuildMember = {
  user: { id: string; username: string; global_name: string | null; avatar: string | null };
  nick: string | null;
};

export function discordHeaders() {
  return { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" };
}

export async function fetchGuildChannels(): Promise<DiscordChannel[]> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
    cache: "no-store",
  });
  return res.ok ? res.json() : [];
}

export async function fetchGuildRoles(): Promise<DiscordRole[]> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
    cache: "no-store",
  });
  return res.ok ? res.json() : [];
}

export async function fetchGuildMembers(): Promise<DiscordGuildMember[]> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=1000`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
    cache: "no-store",
  });
  return res.ok ? res.json() : [];
}
