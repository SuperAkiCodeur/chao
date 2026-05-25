import { db } from "@/lib/db";
import { steamGames, steamConfig, steamChannelPermissions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2, TrendingDown } from "lucide-react";
import { SteamClient } from "./SteamClient";
import { CommandsReference } from "@/components/CommandsReference";
import type { DiscordChannel, DiscordRole } from "@/components/FeatureSettings";

export const dynamic = "force-dynamic";

const GUILD_ID  = process.env.DISCORD_GUILD_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

async function getData() {
  const [games, configs, permissions] = await Promise.all([
    db.select().from(steamGames).where(eq(steamGames.guildId, GUILD_ID)),
    db.select().from(steamConfig).where(eq(steamConfig.guildId, GUILD_ID)),
    db.select().from(steamChannelPermissions).where(eq(steamChannelPermissions.guildId, GUILD_ID)),
  ]);
  return {
    games,
    config: configs[0] ?? { notifChannelId: null, notifRoleId: null },
    permissions,
  };
}

async function getDiscord() {
  const [chRes, roRes] = await Promise.all([
    fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
      cache: "no-store",
    }),
    fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
      cache: "no-store",
    }),
  ]);
  const channels: DiscordChannel[] = chRes.ok ? await chRes.json() : [];
  const roles: DiscordRole[] = roRes.ok ? await roRes.json() : [];
  return { channels, roles };
}

export default async function SteamPage() {
  const [{ games, config, permissions }, { channels, roles }] = await Promise.all([
    getData(),
    getDiscord(),
  ]);

  const onSaleCount = games.filter((g) => g.isOnSale === 1).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Steam</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Liste de jeux trackés, comparaison de prix et alertes promotions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10">
                <Gamepad2 className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground">{games.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Jeux trackés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/10">
                <TrendingDown className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground">{onSaleCount}</p>
            <p className="text-xs text-muted-foreground mt-1">En promo</p>
          </CardContent>
        </Card>
      </div>

      {/* Jeux + config */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-foreground">Jeux trackés</CardTitle>
        </CardHeader>
        <CardContent>
          <SteamClient
            games={games}
            permissions={permissions}
            config={config}
            channels={channels}
            roles={roles}
          />
        </CardContent>
      </Card>

      {/* Commandes */}
      <CommandsReference
        commands={[
          {
            name: "/steam add",
            description:
              "Recherche un jeu sur Steam et l'ajoute à la liste du serveur. Le bot affiche les résultats dans un menu déroulant natif Discord — sélectionne le bon jeu pour l'enregistrer.",
            params: [{ name: "titre", description: "Nom du jeu à rechercher.", required: true }],
          },
          {
            name: "/steam list",
            description:
              "Affiche tous les jeux trackés avec leur prix Steam actuel. Les jeux en promo apparaissent avec leur réduction.",
          },
          {
            name: "/steam prix",
            description:
              "Compare le prix d'un jeu sur Steam et sur les boutiques de revendeurs légitimes (via IsThereAnyDeal : Fanatical, Humble, Green Man Gaming…). Utilise l'autocomplétion pour choisir un jeu de la liste.",
            params: [{ name: "titre", description: "Jeu à comparer — autocomplétion depuis la liste du serveur.", required: true }],
            note: "Nécessite une clé ITAD_API_KEY pour la comparaison multi-boutiques. Sans clé, seul le prix Steam est affiché.",
          },
          {
            name: "/steam remove",
            description:
              "Retire un jeu de la liste du serveur. Utilise l'autocomplétion pour sélectionner le jeu.",
            params: [{ name: "titre", description: "Jeu à retirer — autocomplétion depuis la liste.", required: true }],
          },
          {
            name: "/steam promos",
            description:
              "Affiche les jeux de la liste qui sont actuellement en promo sur Steam. Les données sont mises à jour toutes les 6h par le tracker.",
          },
        ]}
      />
    </div>
  );
}
