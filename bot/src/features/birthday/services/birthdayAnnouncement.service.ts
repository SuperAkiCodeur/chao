import type { Client } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { getSetting, setSetting, SETTING_KEYS } from "../../../core/db/settings.js";
import { BIRTHDAY_CONSTANTS } from "../domain/birthday.constants.js";

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

function buildBirthdayFeatureAnnouncementEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(BIRTHDAY_CONSTANTS.DEFAULT_EMBED_COLOR)
    .setDescription(
      "Le bot peut désormais annoncer ton anniversaire au serveur et te donner un rôle spécial le jour J.",
    )
    .addFields(
      {
        name: "📅 Enregistrer sa date",
        value: "Tape `/birthday` : choisis ton mois puis ton jour de naissance via des menus déroulants. Aucun texte à taper !",
      },
      {
        name: "🗑️ Supprimer ou changer sa date",
        value: "Retape `/birthday` : si une date est déjà enregistrée, tu pourras la supprimer (bouton de confirmation). Pour la changer, supprime puis réenregistre avec la nouvelle date.",
      },
      {
        name: "🎉 Le jour J",
        value: "Un message est automatiquement posté ici, et un rôle temporaire \"du jour\" t'est attribué pour la journée.",
      },
    )
    .setFooter({ text: "Aucune année n'est demandée — seulement le jour et le mois." });
}

export async function postBirthdayFeatureAnnouncementIfNeeded(client: Client): Promise<void> {
  const alreadyPosted = await getSetting(SETTING_KEYS.BIRTHDAY_ANNOUNCEMENT_POSTED);

  if (alreadyPosted === "true") {
    return;
  }

  const channelId = await getSetting(SETTING_KEYS.BIRTHDAY_CHANNEL_ID);

  if (!channelId) {
    logger.warn("[birthday] Cannot post feature announcement: birthday_channel_id not configured");
    return;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel || !isSendableTextChannel(channel) || !channel.isTextBased()) {
    logger.warn("[birthday] Cannot post feature announcement: channel not found or not writable", { channelId });
    return;
  }

  await channel.send({ embeds: [buildBirthdayFeatureAnnouncementEmbed()] });
  await setSetting(SETTING_KEYS.BIRTHDAY_ANNOUNCEMENT_POSTED, "true");

  logger.info("[birthday] Feature announcement posted", { channelId });
}
