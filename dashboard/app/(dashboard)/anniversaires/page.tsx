import { db } from "@/lib/db";
import { birthdays } from "@/lib/schema";
import { fetchGuildMembers, fetchGuildChannels, fetchGuildRoles, type DiscordGuildMember } from "@/lib/discord";
import { FeatureSettings } from "@/components/FeatureSettings";
import { getAllSettings } from "@/lib/settings";
import { PageShell, SectionCard } from "@/components/PageShell";

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

type BirthdayEntry = {
  userId: string;
  day: number;
  month: number;
  displayName: string;
  username: string | null;
  avatarUrl: string;
  isToday: boolean;
};

function avatarUrl(member: DiscordGuildMember | undefined, userId: string): string {
  if (member?.user.avatar) {
    return `https://cdn.discordapp.com/avatars/${userId}/${member.user.avatar}.webp?size=64`;
  }
  return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(userId) >> BigInt(22)) % 6}.png`;
}

async function getData(): Promise<BirthdayEntry[]> {
  const [rows, members] = await Promise.all([
    db.select().from(birthdays),
    fetchGuildMembers(),
  ]);

  const memberMap = new Map(members.map((m) => [m.user.id, m]));

  const now = new Date();
  const dayOfYearKey = (month: number, day: number) => month * 100 + day;
  const todayKey = dayOfYearKey(now.getMonth() + 1, now.getDate());

  const entries: BirthdayEntry[] = rows.map((b) => {
    const member = memberMap.get(b.userId);
    return {
      userId: b.userId,
      day: b.day,
      month: b.month,
      displayName: member?.nick ?? member?.user.global_name ?? member?.user.username ?? b.userId,
      username: member?.user.username ?? null,
      avatarUrl: avatarUrl(member, b.userId),
      isToday: dayOfYearKey(b.month, b.day) === todayKey,
    };
  });

  return entries.sort((a, b) => {
    const aKey = dayOfYearKey(a.month, a.day);
    const bKey = dayOfYearKey(b.month, b.day);
    const aDistance = aKey >= todayKey ? aKey - todayKey : aKey + 1300 - todayKey;
    const bDistance = bKey >= todayKey ? bKey - todayKey : bKey + 1300 - todayKey;
    return aDistance - bDistance;
  });
}

export default async function AnniversairesPage() {
  const [entries, channels, roles, settings] = await Promise.all([
    getData(), fetchGuildChannels(), fetchGuildRoles(), getAllSettings(),
  ]);

  return (
    <PageShell title="Anniversaires" description="Membres ayant enregistré leur date de naissance via /birthday">

      <SectionCard
        title="Liste des anniversaires"
        badge={`${entries.length} enregistré${entries.length !== 1 ? "s" : ""}`}
        noPadding
      >
        {entries.length === 0 ? (
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.30)", padding: "20px" }}>
            Aucun anniversaire enregistré pour le moment. Les membres peuvent en ajouter un avec{" "}
            <code style={{ fontFamily: "monospace", fontSize: 12, background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4 }}>/birthday</code>.
          </p>
        ) : (
          <div>
            {entries.map((e) => (
              <div
                key={e.userId}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={e.avatarUrl} alt=""
                    style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.08)", objectFit: "cover" }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <p style={{ fontSize: 18, fontWeight: 400, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1, fontFamily: "var(--font-serif)" }}>
                        {e.displayName}
                      </p>
                      {e.isToday && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#ffc857", background: "rgba(255,200,87,0.14)", padding: "1px 6px", borderRadius: 99, flexShrink: 0 }}>
                          🎂 aujourd&apos;hui
                        </span>
                      )}
                    </div>
                    {e.username && (
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", marginTop: 3 }}>@{e.username}</p>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", flexShrink: 0, marginLeft: 12 }}>
                  {e.day} {MONTH_NAMES[e.month - 1]}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <FeatureSettings
        channels={channels}
        roles={roles}
        settings={settings}
        noCollapse
        fields={[
          { key: "birthday_channel_id", label: "Salon d'annonces", description: "Salon où le message d'anniversaire est posté chaque jour", kind: "channel" },
          { key: "birthday_role_id",    label: "Rôle du jour",     description: "Attribué le jour de l'anniversaire, retiré le lendemain",   kind: "role" },
        ]}
      />

    </PageShell>
  );
}
