import { getAllSettings } from "@/lib/settings";
import { fetchGuildChannels, fetchGuildRoles } from "@/lib/discord";
import { SettingsClient } from "./SettingsClient";
import { PageShell } from "@/components/PageShell";

export const dynamic = "force-dynamic";

export default async function ParametresPage() {
  const [channelsRaw, rolesRaw, settings] = await Promise.all([
    fetchGuildChannels(),
    fetchGuildRoles(),
    getAllSettings(),
  ]);

  const channels = [...channelsRaw].sort((a, b) => a.position - b.position);
  const roles    = [...rolesRaw].sort((a, b) => b.position - a.position);

  return (
    <PageShell title="Paramètres" description="Configuration des salons et rôles utilisés par le bot">
      <SettingsClient channels={channels} roles={roles} settings={settings} />
    </PageShell>
  );
}
