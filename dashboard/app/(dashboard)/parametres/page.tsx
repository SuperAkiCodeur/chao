import { getAllSettings } from "@/lib/settings";
import { SettingsClient, type DiscordChannel, type DiscordRole } from "./SettingsClient";
import { PageShell } from "@/components/PageShell";

export const dynamic = "force-dynamic";

const GUILD_ID  = process.env.DISCORD_GUILD_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

async function getChannels(): Promise<DiscordChannel[]> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: "no-store",
  });
  if (!res.ok) return [];
  const channels = await res.json() as DiscordChannel[];
  return channels.sort((a, b) => a.position - b.position);
}

async function getRoles(): Promise<DiscordRole[]> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: "no-store",
  });
  if (!res.ok) return [];
  const roles = await res.json() as DiscordRole[];
  return roles.sort((a, b) => b.position - a.position);
}

export default async function ParametresPage() {
  const [channels, roles, settings] = await Promise.all([getChannels(), getRoles(), getAllSettings()]);

  return (
    <PageShell title="Paramètres" description="Configuration des salons et rôles utilisés par le bot">
      <SettingsClient channels={channels} roles={roles} settings={settings} />
    </PageShell>
  );
}
