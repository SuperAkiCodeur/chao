import { db } from "@/lib/db";
import { valorantLinks } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { ValorantClient } from "./ValorantClient";
import { FeatureSettings, type DiscordChannel, type DiscordRole } from "@/components/FeatureSettings";
import { CommandsReference } from "@/components/CommandsReference";
import { ApiAttribution } from "@/components/ApiAttribution";
import { getAllSettings } from "@/lib/settings";
import { PageShell, StatCard, SectionCard } from "@/components/PageShell";

export const dynamic = "force-dynamic";

const DEFAULT_GUILD_ID = process.env.DISCORD_GUILD_ID ?? "";
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

async function getData() {
  return db.select().from(valorantLinks).orderBy(desc(valorantLinks.linkedAt));
}

async function getChannels(): Promise<DiscordChannel[]> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${DEFAULT_GUILD_ID}/channels`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: "no-store",
  });
  return res.ok ? res.json() : [];
}

export default async function ValorantPage() {
  const [accounts, channels, settings] = await Promise.all([getData(), getChannels(), getAllSettings()]);

  return (
    <PageShell title="Valorant" description="Comptes Riot liés aux membres Discord">

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
        <StatCard value={accounts.length} label="Comptes liés" sub="joueurs enregistrés" />
      </div>

      <SectionCard title="Comptes liés" badge={`${accounts.length} compte${accounts.length !== 1 ? "s" : ""}`}>
        <div style={{ padding: "0 20px 16px" }}>
          <ValorantClient accounts={accounts} defaultGuildId={DEFAULT_GUILD_ID} />
        </div>
      </SectionCard>

      <FeatureSettings channels={channels} roles={[] as DiscordRole[]} settings={settings} fields={[
        { key: "valorant_channel_id", label: "Salon Valorant", description: "Salon où le bot poste les résultats", kind: "channel" },
      ]} />

      <CommandsReference commands={[{
        name: "/valorant", description: "Ouvre un menu éphémère avec cinq actions :",
        params: [
          { name: "🔗 Lier mon compte",   description: "Associe ton Riot ID (format Pseudo#Tag) à ton profil Discord.",                            required: false },
          { name: "📊 Mes résultats",     description: "Affiche tes derniers matchs : mode, résultat, K/D/A et évolution de rang.",                required: false },
          { name: "📈 Mes stats",         description: "Statistiques détaillées : Global, Par agent, Par map, Temps de jeu.",                      required: false },
          { name: "🏆 Classement",        description: "Classement des membres du serveur ayant lié leur compte, triés par rang.",                  required: false },
          { name: "❓ Aide",               description: "Affiche la liste de toutes les actions disponibles.",                                      required: false },
        ],
      }]} />

      <ApiAttribution name="HenrikDev API" url="https://henrikdev.xyz/" description="statistiques et résultats Valorant via l'API Riot Games" />

    </PageShell>
  );
}
