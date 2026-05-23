import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

// Seuls les utilisateurs dont le Discord ID est dans cette liste peuvent se connecter.
const ALLOWED_USER_IDS = (process.env.ALLOWED_DISCORD_IDS ?? "").split(",").filter(Boolean);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      // Bloque toute connexion si aucune allowlist n'est configurée
      if (ALLOWED_USER_IDS.length === 0) return false;
      const id = (profile as { id?: string })?.id;
      return id ? ALLOWED_USER_IDS.includes(id) : false;
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
