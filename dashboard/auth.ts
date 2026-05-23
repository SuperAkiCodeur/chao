import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

const ADMINISTRATOR_PERMISSION = BigInt(0x8);

async function isGuildAdmin(userId: string): Promise<boolean> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId || !botToken) {
    console.error("[auth] DISCORD_GUILD_ID ou DISCORD_BOT_TOKEN manquant");
    return false;
  }

  try {
    const headers = { Authorization: `Bot ${botToken}` };

    // Récupère en parallèle : membre, guild (pour owner_id), rôles
    const [memberRes, guildRes, rolesRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, { headers }),
      fetch(`https://discord.com/api/v10/guilds/${guildId}`, { headers }),
      fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers }),
    ]);

    if (!memberRes.ok) {
      console.error(`[auth] Membre ${userId} introuvable dans le serveur (${memberRes.status})`);
      return false;
    }

    const member = await memberRes.json() as { roles: string[] };

    // Le propriétaire du serveur est toujours admin (sans rôle explicite)
    if (guildRes.ok) {
      const guild = await guildRes.json() as { owner_id: string };
      if (guild.owner_id === userId) {
        console.log(`[auth] ${userId} est propriétaire du serveur → accès autorisé`);
        return true;
      }
    }

    if (!rolesRes.ok) {
      console.error(`[auth] Impossible de récupérer les rôles (${rolesRes.status})`);
      return false;
    }

    const allRoles = await rolesRes.json() as { id: string; permissions: string }[];

    // IDs des rôles qui ont la permission ADMINISTRATOR
    const adminRoleIds = new Set(
      allRoles
        .filter((r) => (BigInt(r.permissions) & ADMINISTRATOR_PERMISSION) === ADMINISTRATOR_PERMISSION)
        .map((r) => r.id),
    );

    const hasAdminRole = member.roles.some((roleId) => adminRoleIds.has(roleId));
    if (!hasAdminRole) {
      console.error(`[auth] ${userId} refusé — aucun rôle admin parmi : [${member.roles.join(", ")}]`);
    }
    return hasAdminRole;
  } catch (err) {
    console.error("[auth] Erreur lors de la vérification des permissions :", err);
    return false;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const userId = (profile as { id?: string })?.id;
      if (!userId) return false;
      return isGuildAdmin(userId);
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as typeof session.user & { discordId: string }).discordId = token.sub;
      }
      return session;
    },
    async jwt({ token, profile }) {
      if (profile) {
        token.sub = (profile as { id?: string }).id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
