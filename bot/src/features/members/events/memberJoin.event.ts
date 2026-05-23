import { Events, type GuildMember } from "discord.js";
import type { AppEvent } from "../../../core/discord/types/appEvent.js";
import { logger } from "../../../core/app/logger.js";
import { insertLog } from "../../../core/db/logger.js";
import { getSetting, SETTING_KEYS } from "../../../core/db/settings.js";

export const memberJoinEvent: AppEvent<Events.GuildMemberAdd> = {
  name: Events.GuildMemberAdd,

  async execute(member: GuildMember): Promise<void> {
    const memberRoleId = await getSetting(SETTING_KEYS.MEMBER_ROLE_ID);

    if (!memberRoleId) {
      return;
    }

    const role = member.guild.roles.cache.get(memberRoleId);

    if (!role) {
      logger.warn("[members] member_role_id set but role not found in guild", {
        roleId: memberRoleId,
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
