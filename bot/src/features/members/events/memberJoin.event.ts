import { Events, type GuildMember } from "discord.js";
import type { AppEvent } from "../../../core/discord/types/appEvent.js";
import { env } from "../../../core/config/env.js";
import { logger } from "../../../core/app/logger.js";
import { insertLog } from "../../../core/db/logger.js";

export const memberJoinEvent: AppEvent<Events.GuildMemberAdd> = {
  name: Events.GuildMemberAdd,

  async execute(member: GuildMember): Promise<void> {
    if (!env.MEMBER_ROLE_ID) {
      return;
    }

    const role = member.guild.roles.cache.get(env.MEMBER_ROLE_ID);

    if (!role) {
      logger.warn("[members] MEMBER_ROLE_ID set but role not found in guild", {
        roleId: env.MEMBER_ROLE_ID,
        guildId: member.guild.id,
      });
      return;
    }

    try {
      await member.roles.add(role, "Attribution automatique du rôle membre");
      logger.info("[members] Role added to new member", {
        userId: member.id,
        roleId: role.id,
        guildId: member.guild.id,
      });
      void insertLog({
        type: "member",
        action: "joined",
        description: `👤 ${member.user.username} a rejoint le serveur`,
        userId: member.id,
        userName: member.user.username,
      });
    } catch (error) {
      logger.error("[members] Failed to add role to new member", {
        userId: member.id,
        roleId: role.id,
        error,
      });
    }
  },
};
