import type { Client } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { getSetting, SETTING_KEYS } from "../../../core/db/settings.js";
import { BIRTHDAY_CONSTANTS } from "../domain/birthday.constants.js";
import { findBirthdaysByDayMonth } from "../repositories/birthday.repository.js";
import { addBirthdayRoleByUserId, removeBirthdayRole } from "./birthdayRole.service.js";

type SendableTextChannel = {
  isTextBased: () => boolean;
  send: (options: { embeds: EmbedBuilder[] }) => Promise<unknown>;
};

function isSendableTextChannel(channel: unknown): channel is SendableTextChannel {
  if (!channel || typeof channel !== "object") {
    return false;
  }

  const candidate = channel as { isTextBased?: unknown; send?: unknown };

  return (
    typeof candidate.isTextBased === "function" &&
    typeof candidate.send === "function"
  );
}

function getParisNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
}

function msUntilNextDailyCheck(): number {
  const nowParis = getParisNow();
  const target = new Date(nowParis);
  target.setHours(BIRTHDAY_CONSTANTS.DAILY_CHECK_HOUR, 0, 0, 0);

  if (target.getTime() <= nowParis.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime() - nowParis.getTime();
}

function buildBirthdayEmbed(userIds: string[]): EmbedBuilder {
  const mentions = userIds.map((id) => `<@${id}>`).join(", ");

  return new EmbedBuilder()
    .setColor(BIRTHDAY_CONSTANTS.DEFAULT_EMBED_COLOR)
    .setTitle("🎂 Joyeux anniversaire !")
    .setDescription(`Aujourd'hui, on fête l'anniversaire de ${mentions} ! 🎉`);
}

async function cleanupYesterdaysBirthdayRole(client: Client, roleId: string): Promise<void> {
  for (const guild of client.guilds.cache.values()) {
    const role = guild.roles.cache.get(roleId);

    if (!role) {
      continue;
    }

    for (const member of role.members.values()) {
      await removeBirthdayRole(member, roleId).catch((error: unknown) => {
        logger.error("[birthday] Failed to remove birthday role", {
          guildId: guild.id,
          userId: member.id,
          error,
        });
      });
    }
  }
}

async function runDailyBirthdayCheck(client: Client): Promise<void> {
  const [channelId, roleId] = await Promise.all([
    getSetting(SETTING_KEYS.BIRTHDAY_CHANNEL_ID),
    getSetting(SETTING_KEYS.BIRTHDAY_ROLE_ID),
  ]);

  if (roleId) {
    await cleanupYesterdaysBirthdayRole(client, roleId);
  }

  const nowParis = getParisNow();
  const todaysBirthdays = await findBirthdaysByDayMonth(nowParis.getDate(), nowParis.getMonth() + 1);

  if (todaysBirthdays.length === 0) {
    logger.info("[birthday] Daily birthday check completed, no birthday today");
    return;
  }

  const userIdsByGuild = new Map<string, string[]>();

  for (const birthday of todaysBirthdays) {
    const userIds = userIdsByGuild.get(birthday.guildId) ?? [];
    userIds.push(birthday.userId);
    userIdsByGuild.set(birthday.guildId, userIds);
  }

  for (const [guildId, userIds] of userIdsByGuild) {
    const guild = await client.guilds.fetch(guildId).catch(() => null);

    if (!guild) {
      continue;
    }

    if (roleId) {
      for (const userId of userIds) {
        await addBirthdayRoleByUserId(guild, userId, roleId).catch((error: unknown) => {
          logger.error("[birthday] Failed to add birthday role", { guildId, userId, error });
        });
      }
    }

    if (channelId) {
      const channel = await client.channels.fetch(channelId).catch(() => null);

      if (channel && isSendableTextChannel(channel) && channel.isTextBased()) {
        await channel.send({ embeds: [buildBirthdayEmbed(userIds)] }).catch((error: unknown) => {
          logger.error("[birthday] Failed to send birthday announcement", { guildId, channelId, error });
        });
      }
    }
  }

  logger.info("[birthday] Daily birthday check completed", {
    celebrantsCount: todaysBirthdays.length,
  });
}

let scheduledBirthdayCheck: NodeJS.Timeout | null = null;

function scheduleNextBirthdayCheck(client: Client): void {
  if (scheduledBirthdayCheck) {
    clearTimeout(scheduledBirthdayCheck);
  }

  const delay = msUntilNextDailyCheck();

  scheduledBirthdayCheck = setTimeout(() => {
    void runDailyBirthdayCheck(client)
      .catch((error: unknown) => {
        logger.error("[birthday] Daily birthday check failed", { error });
      })
      .finally(() => {
        scheduleNextBirthdayCheck(client);
      });
  }, delay);

  logger.info("[birthday] Next daily birthday check scheduled", { delay });
}

export function scheduleBirthdayDailyCheck(client: Client): void {
  scheduleNextBirthdayCheck(client);
}
