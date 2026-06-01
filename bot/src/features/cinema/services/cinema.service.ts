import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  Guild,
  ModalSubmitInteraction,
  PermissionsBitField,
  StringSelectMenuInteraction,
} from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { env } from "../../../core/config/env.js";
import { logger } from "../../../core/app/logger.js";
import { getSetting, SETTING_KEYS } from "../../../core/db/settings.js";
import {
  addSpectatorRoleByUserId,
  removeSpectatorRoleByUserId,
} from "./spectatorRole.service.js";
import {
  CINEMA_CONSTANTS,
  CINEMA_MENU_ID,
  CINEMA_MODAL_START_PREFIX,
  CINEMA_TYPE_SELECT_START_ID,
  CINEMA_END_SELECT_ID,
  CINEMA_BACK_BTN_ID,
  CINEMA_INPUT_TITLE_ID,
  CINEMA_INPUT_DATE_ID,
  CINEMA_INPUT_TIME_ID,
} from "../domain/cinema.constants.js";
import {
  parseCinemaViewingDate,
  validateCinemaScheduleInput,
  validateCinemaTitleInput,
} from "../domain/cinema.validators.js";
import type {
  EndCinemaPartyParams,
  StartCinemaPartyParams,
  CinemaCommandResult,
  CinemaParty,
  CinemaRatingValue,
} from "../domain/cinema.types.js";
import {
  addUserToCinemaParty,
  closeCinemaRatingSession,
  deleteCinemaParty,
  findActiveCinemaPartiesByGuild,
  findActiveCinemaPartyByMedia,
  findCinemaPartyByMessageId,
  findCinemaPartyByRatingMessageId,
  openCinemaRatingSession,
  removeUserFromCinemaParty,
  removeCinemaPartyUserRating,
  saveCinemaParty,
  setCinemaPartyUserRating,
  userHasAnotherActiveCinemaParty,
} from "../repositories/cinema.repository.js";
// Note: findActiveCinemaPartiesByGuild is used by handleCinemaMenu (end) and handleCinemaEndPartySelect
import { fetchTmdbMedia } from "./tmdb.service.js";
import { buildCinemaAnnouncement } from "./cinemaAnnouncement.service.js";
import { insertLog } from "../../../core/db/logger.js";
import {
  cancelCinemaStartAnnouncement,
  scheduleCinemaRatingClosure,
  scheduleCinemaStartAnnouncement,
  triggerCinemaStartAnnouncement,
} from "./cinemaScheduler.service.js";

type WritableInteractionChannel = NonNullable<ChatInputCommandInteraction["channel"]> & {
  send: (...args: any[]) => Promise<any>;
};

type FetchableMessageChannel = {
  messages: {
    fetch: (messageId: string) => Promise<any>;
  };
};

type SendableTextChannel = {
  isTextBased: () => boolean;
  send: (options: {
    embeds?: EmbedBuilder[];
    components?: ActionRowBuilder<ButtonBuilder>[];
  }) => Promise<{
    id: string;
  }>;
};

function ensureGuildInteraction(
  interaction: ChatInputCommandInteraction,
): asserts interaction is ChatInputCommandInteraction<"cached"> {
  if (!interaction.inCachedGuild()) {
    throw new Error("This command must be used in a guild");
  }
}

function ensureWritableTextChannel(
  channel: ChatInputCommandInteraction["channel"],
): asserts channel is WritableInteractionChannel {
  if (
    !channel ||
    !channel.isTextBased() ||
    !("send" in channel) ||
    typeof channel.send !== "function"
  ) {
    throw new Error("Channel is not writable text-based");
  }
}

function hasFetchableMessages(channel: unknown): channel is FetchableMessageChannel {
  if (!channel || typeof channel !== "object") {
    return false;
  }

  if (!("messages" in channel)) {
    return false;
  }

  const candidate = channel as { messages?: { fetch?: unknown } };

  return typeof candidate.messages?.fetch === "function";
}

function isSendableTextChannel(channel: unknown): channel is SendableTextChannel {
  if (!channel || typeof channel !== "object") {
    return false;
  }

  if (!("isTextBased" in channel) || !("send" in channel)) {
    return false;
  }

  const candidate = channel as {
    isTextBased?: unknown;
    send?: unknown;
  };

  return (
    typeof candidate.isTextBased === "function" &&
    typeof candidate.send === "function"
  );
}

function isCinemaStartChannelAllowed(channelId: string): boolean {
  return channelId === env.TICKET_CHANNEL_ID;
}

function isCinemaEndChannelAllowed(
  channel: ChatInputCommandInteraction["channel"],
): boolean {
  if (!channel || !("parentId" in channel)) {
    return false;
  }

  return channel.parentId === env.CINEMA_CATEGORY_ID;
}

function buildCinemaRatingEmbed(cinemaParty: CinemaParty): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(CINEMA_CONSTANTS.DEFAULT_EMBED_COLOR)
    .setTitle(`🎬 Notez ${cinemaParty.title}`)
    .setDescription("Clique sur une étoile pour noter. Reclique pour retirer ta note.\n\nLe vote se ferme dans 1h.");
}


async function createCinemaRatingMessage(
  client: Client,
  cinemaParty: CinemaParty,
): Promise<CinemaParty> {
  const letterboxdChannelId = env.LETTERBOXD_CHANNEL_ID;
  const channel = await client.channels.fetch(letterboxdChannelId).catch(() => null);

  if (!channel || !isSendableTextChannel(channel) || !channel.isTextBased()) {
    throw new Error("LETTERBOXD channel not found or not writable");
  }

  const embed = buildCinemaRatingEmbed(cinemaParty);

  const ratingButtons = ([1, 2, 3, 4, 5] as const).map((value) =>
    new ButtonBuilder()
      .setCustomId(`${CINEMA_CONSTANTS.RATING_BUTTON_PREFIX}${value}`)
      .setLabel("⭐".repeat(value))
      .setStyle(ButtonStyle.Secondary),
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(...ratingButtons);

  const ratingMessage = await channel.send({
    embeds: [embed],
    components: [row],
  });

  const ratingClosesAt = new Date(
    Date.now() + CINEMA_CONSTANTS.RATING_DURATION_MS,
  ).toISOString();

  const updatedCinemaParty = await openCinemaRatingSession({
    messageId: cinemaParty.messageId,
    ratingChannelId: letterboxdChannelId,
    ratingMessageId: ratingMessage.id,
    ratingClosesAt,
  });

  if (!updatedCinemaParty) {
    throw new Error("Failed to open cinema rating session");
  }

  scheduleCinemaRatingClosure(client, updatedCinemaParty);

  logger.info("Cinema rating session opened", {
    guildId: updatedCinemaParty.guildId,
    channelId: updatedCinemaParty.ratingChannelId,
    messageId: updatedCinemaParty.messageId,
    ratingMessageId: updatedCinemaParty.ratingMessageId,
    title: updatedCinemaParty.title,
    ratingClosesAt: updatedCinemaParty.ratingClosesAt,
  });

  return updatedCinemaParty;
}

async function deleteCinemaMessageById(
  client: Client,
  channelId: string,
  messageId?: string,
): Promise<void> {
  if (!messageId) {
    return;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel || !channel.isTextBased() || !hasFetchableMessages(channel)) {
    return;
  }

  const message = await channel.messages.fetch(messageId).catch(() => null);

  if (!message) {
    return;
  }

  await message.delete().catch((error: unknown) => {
    logger.error("Failed to delete cinema message", {
      channelId,
      messageId,
      error,
    });
  });
}

async function deleteCinemaAnnouncementMessages(
  client: Client,
  cinemaParty: CinemaParty,
): Promise<void> {
  await deleteCinemaMessageById(
    client,
    cinemaParty.channelId,
    cinemaParty.startAnnouncementMessageId,
  );

  await deleteCinemaMessageById(
    client,
    cinemaParty.channelId,
    cinemaParty.messageId,
  );
}

async function cleanupSpectatorRolesForCinemaParty(
  guild: Guild,
  cinemaParty: CinemaParty,
): Promise<void> {
  if (!cinemaParty.roleId) {
    return;
  }

  for (const userId of cinemaParty.users) {
    const hasAnotherCinemaParty = await userHasAnotherActiveCinemaParty(
      cinemaParty.guildId,
      userId,
      cinemaParty.messageId,
    );

    if (!hasAnotherCinemaParty) {
      await removeSpectatorRoleByUserId(
        guild,
        userId,
        cinemaParty.roleId,
        "Cinema party ended",
      );
    }
  }
}

async function cleanupCinemaParty(
  client: Client,
  guild: Guild,
  cinemaParty: CinemaParty,
  options?: {
    preserveCinemaParty?: boolean;
  },
): Promise<void> {
  cancelCinemaStartAnnouncement(cinemaParty.messageId);
  await deleteCinemaAnnouncementMessages(client, cinemaParty);
  await cleanupSpectatorRolesForCinemaParty(guild, cinemaParty);

  if (!options?.preserveCinemaParty) {
    await deleteCinemaParty(cinemaParty.messageId);
  }
}

export async function startCinemaParty(
  params: StartCinemaPartyParams,
): Promise<CinemaCommandResult> {
  const { interaction, type, title, date, time } = params;

  ensureGuildInteraction(interaction);
  ensureWritableTextChannel(interaction.channel);

  if (!isCinemaStartChannelAllowed(interaction.channelId)) {
    return {
      message: `❌ La programmation est utilisable uniquement dans le salon <#${env.TICKET_CHANNEL_ID}>.`,
    };
  }

  const titleValidation = validateCinemaTitleInput(title);

  if (!titleValidation.success) {
    return {
      message: titleValidation.message,
    };
  }

  const scheduleValidation = validateCinemaScheduleInput(date, time);

  if (!scheduleValidation.success) {
    return {
      message: scheduleValidation.message,
    };
  }

  const viewingDate = parseCinemaViewingDate(date, time);

  if (!viewingDate) {
    return {
      message: "❌ Date ou heure invalide.",
    };
  }

  const media = await fetchTmdbMedia(type, title);

  if (!media) {
    return {
      message: `❌ Aucun résultat trouvé pour "${title}".`,
    };
  }

  const activeCinemaParty = await findActiveCinemaPartyByMedia(type, media.mediaId);

  if (activeCinemaParty) {
    return {
      message: `❌ Une diffusion est déjà prévue pour "${activeCinemaParty.title}".`,
    };
  }

  const { embed, resolvedTitle } = buildCinemaAnnouncement({
    type,
    title,
    date,
    time,
    bestMatch: media.bestMatch,
    details: media.details,
    credits: media.credits,
  });

  const ticketButton = new ButtonBuilder()
    .setCustomId(CINEMA_CONSTANTS.TICKET_BUTTON_ID)
    .setLabel("Prendre un ticket")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("🎟️");

  const launchButton = new ButtonBuilder()
    .setCustomId(CINEMA_CONSTANTS.LAUNCH_BUTTON_ID)
    .setLabel("Lancer la diffusion")
    .setStyle(ButtonStyle.Success)
    .setEmoji("▶️");

  const endButton = new ButtonBuilder()
    .setCustomId(CINEMA_CONSTANTS.END_BUTTON_ID)
    .setLabel("Terminer la diffusion")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("⏹️");

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(ticketButton, launchButton, endButton);

  const message = await interaction.channel.send({
    embeds: [embed],
    components: [row],
  });

  const cinemaParty: CinemaParty = {
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    messageId: message.id,
    roleId: await getSetting(SETTING_KEYS.CINEMA_SPECTATOR_ROLE_ID) ?? "",
    title: resolvedTitle,
    mediaType: type,
    mediaId: media.mediaId,
    viewingAt: viewingDate.toISOString(),
    status: CINEMA_CONSTANTS.ACTIVE_STATUS,
    createdBy: interaction.user.id,
    users: [],
  };

  await saveCinemaParty(cinemaParty);
  scheduleCinemaStartAnnouncement(interaction.client, cinemaParty);

  logger.info("Cinema party started", {
    guildId: cinemaParty.guildId,
    channelId: cinemaParty.channelId,
    messageId: cinemaParty.messageId,
    mediaType: cinemaParty.mediaType,
    mediaId: cinemaParty.mediaId,
    title: cinemaParty.title,
    viewingAt: cinemaParty.viewingAt,
  });

  const typeLabel = type === "movie" ? "Film" : "Série";
  const viewingFormatted = new Date(viewingDate).toLocaleString("fr-FR", {
    day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
  });
  void insertLog({
    type: "cinema",
    action: "party_created",
    description: `📺 ${typeLabel} programmé : « ${resolvedTitle} » le ${viewingFormatted}`,
    userId: interaction.user.id,
    userName: interaction.user.username,
    metadata: { title: resolvedTitle, mediaType: type, viewingAt: viewingDate.toISOString() },
  });

  return {
    message: "✅ Annonce publiée !",
  };
}

export async function endCinemaParty(
  params: EndCinemaPartyParams,
): Promise<CinemaCommandResult> {
  const { interaction, type, title } = params;

  ensureGuildInteraction(interaction);

  if (!isCinemaEndChannelAllowed(interaction.channel)) {
    return {
      message: "❌ La clôture est utilisable uniquement dans la catégorie Cinéma.",
    };
  }

  const titleValidation = validateCinemaTitleInput(title);

  if (!titleValidation.success) {
    return {
      message: titleValidation.message,
    };
  }

  const media = await fetchTmdbMedia(type, title);

  if (!media) {
    return {
      message: `❌ Aucun résultat trouvé pour "${title}".`,
    };
  }

  const activeCinemaParty = await findActiveCinemaPartyByMedia(type, media.mediaId);

  if (!activeCinemaParty) {
    return {
      message: `❌ Aucune diffusion active trouvée pour "${title}".`,
    };
  }

  const endedCinemaParty: CinemaParty = {
    ...activeCinemaParty,
    status: CINEMA_CONSTANTS.ENDED_STATUS,
  };

  await saveCinemaParty(endedCinemaParty);

  const viewingTimestamp = new Date(endedCinemaParty.viewingAt).getTime();
  const hasViewingStarted =
    !Number.isNaN(viewingTimestamp) && viewingTimestamp <= Date.now();
  
  await cleanupCinemaParty(
    interaction.client,
    interaction.guild,
    endedCinemaParty,
    { preserveCinemaParty: hasViewingStarted },
  );

  if (hasViewingStarted) {
    await createCinemaRatingMessage(interaction.client, endedCinemaParty);
  }

  logger.info("Cinema party ended", {
    guildId: endedCinemaParty.guildId,
    channelId: endedCinemaParty.channelId,
    messageId: endedCinemaParty.messageId,
    mediaType: endedCinemaParty.mediaType,
    mediaId: endedCinemaParty.mediaId,
    title: endedCinemaParty.title,
  });

  return {
    message: hasViewingStarted
      ? `✅ Diffusion terminée pour "${endedCinemaParty.title}". Le vote est ouvert pendant 1h.`
      : `✅ Diffusion annulée pour "${endedCinemaParty.title}".`,
  };
}

export async function handleDeletedCinemaMessage(params: {
  messageId: string;
  guildId: string | null;
  guild?: Guild;
}): Promise<void> {
  const cinemaParty = await findCinemaPartyByMessageId(params.messageId);

  if (!cinemaParty) {
    return;
  }

  if (
    cinemaParty.status === CINEMA_CONSTANTS.ENDED_STATUS ||
    cinemaParty.ratingMessageId ||
    cinemaParty.ratingClosesAt
  ) {
    logger.info("Ignoring cinema message deletion because cinema party is already ended", {
      messageId: cinemaParty.messageId,
      guildId: cinemaParty.guildId,
      title: cinemaParty.title,
      status: cinemaParty.status,
      ratingMessageId: cinemaParty.ratingMessageId ?? null,
      ratingClosesAt: cinemaParty.ratingClosesAt ?? null,
    });
    return;
  }

  cancelCinemaStartAnnouncement(cinemaParty.messageId);

  if (params.guild) {
    await cleanupSpectatorRolesForCinemaParty(params.guild, cinemaParty);
  }

  await deleteCinemaParty(cinemaParty.messageId);

  logger.info("Cinema party deleted after main message deletion", {
    messageId: cinemaParty.messageId,
    guildId: cinemaParty.guildId,
    title: cinemaParty.title,
  });
}

export async function handleCinemaTicketButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: "❌ Cette action doit être effectuée dans un serveur.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const messageId = interaction.message.id;
  const { guild } = interaction;
  const userId = interaction.user.id;

  const cinemaParty = await findCinemaPartyByMessageId(messageId);

  if (!cinemaParty) {
    await interaction.reply({
      content: "❌ Cette diffusion n'existe plus.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const isAlreadyIn = cinemaParty.users.includes(userId);

  if (isAlreadyIn) {
    await interaction.reply({
      content: `ℹ️ Tu as déjà une place réservée pour **${cinemaParty.title}** !`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  } else {
    const updated = await addUserToCinemaParty(messageId, userId);

    if (updated?.roleId) {
      await addSpectatorRoleByUserId(guild, userId, updated.roleId, "User joined cinema party");
    }

    await interaction.reply({
      content: `✅ Place réservée pour **${cinemaParty.title}** !`,
      flags: MessageFlags.Ephemeral,
    });

    logger.info("Cinema party ticket added", { guildId: guild.id, messageId, userId, title: cinemaParty.title });
  }
}

// ── Menu-driven handlers ──────────────────────────────────────────────────────

function buildCinemaHelpEmbed(): EmbedBuilder {
  const nowParis = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const dd = String(nowParis.getDate()).padStart(2, "0");
  const mm = String(nowParis.getMonth() + 1).padStart(2, "0");
  const yy = String(nowParis.getFullYear()).slice(-2);
  const plus5 = new Date(nowParis.getTime() + 5 * 60 * 1000);
  const hh = String(plus5.getHours()).padStart(2, "0");
  const min = String(plus5.getMinutes()).padStart(2, "0");
  const exDate = `${dd}/${mm}/${yy}`;
  const exTime = `${hh}:${min}`;

  return new EmbedBuilder()
    .setColor(CINEMA_CONSTANTS.DEFAULT_EMBED_COLOR)
    .setTitle("❓ Aide")
    .setDescription("Toutes les actions disponibles.")
    .addFields(
      {
        name: "📅 Programmer une diffusion",
        value:
          "Programme un film ou une série.\n" +
          "• **Titre** — Recherché sur TMDB\n" +
          `• **Date** — \`JJ/MM/AA\` (ex: \`${exDate}\`)\n` +
          `• **Heure** — \`HH:MM\` (ex: \`${exTime}\`)\n` +
          "→ Crée l'annonce, ouvre les inscriptions et planifie le rappel.",
      },
      {
        name: "⏹️ Terminer une diffusion",
        value:
          "Sélectionne une diffusion dans la liste pour la clôturer.\n" +
          "→ Si la diffusion a été lancée, ouvre les votes de notation (⭐ à ⭐⭐⭐⭐⭐).\n" +
          "→ Sinon, annule la diffusion.\n" +
          "*(Réservé à l'organisateur, aux administrateurs et aux modérateurs)*",
      },
    )
    .setFooter({ text: "Les affiches et métadonnées proviennent de TMDB" });
}

function buildCinemaMainMenu() {
  const select = new StringSelectMenuBuilder()
    .setCustomId(CINEMA_MENU_ID)
    .setPlaceholder("Choisir une action…")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Programmer une diffusion").setValue("start").setEmoji("📅")
        .setDescription("Créer une annonce de soirée film ou série"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Terminer une diffusion").setValue("end").setEmoji("⏹️")
        .setDescription("Clore une diffusion en cours et ouvrir les votes"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Aide").setValue("help").setEmoji("❓")
        .setDescription("Voir toutes les actions disponibles"),
    );

  return {
    content: "🍿 **Cinéma** — Que veux-tu faire ?",
    embeds: [] as EmbedBuilder[],
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
  };
}

function buildCinemaBackRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CINEMA_BACK_BTN_ID)
      .setLabel("↩ Revenir au menu")
      .setStyle(ButtonStyle.Secondary),
  );
}

// ── Shared end-party helpers ──────────────────────────────────────────────────

function canEndCinemaParty(
  cinemaParty: CinemaParty,
  userId: string,
  permissions: Readonly<PermissionsBitField>,
): boolean {
  const isCreator = cinemaParty.createdBy === userId;
  const isAdminOrMod =
    permissions.has(PermissionFlagsBits.Administrator) ||
    permissions.has(PermissionFlagsBits.ManageGuild) ||
    permissions.has(PermissionFlagsBits.ModerateMembers);
  return isCreator || isAdminOrMod;
}

async function performEndCinemaParty(
  client: Client,
  guild: Guild,
  cinemaParty: CinemaParty,
): Promise<string> {
  const viewingTimestamp = new Date(cinemaParty.viewingAt).getTime();
  const hasViewingStarted =
    (!Number.isNaN(viewingTimestamp) && viewingTimestamp <= Date.now()) ||
    !!cinemaParty.startAnnouncementMessageId;

  const endedParty: CinemaParty = { ...cinemaParty, status: CINEMA_CONSTANTS.ENDED_STATUS };
  await saveCinemaParty(endedParty);

  await cleanupCinemaParty(client, guild, endedParty, { preserveCinemaParty: hasViewingStarted });

  if (hasViewingStarted) {
    await createCinemaRatingMessage(client, endedParty);
  }

  return hasViewingStarted
    ? `✅ Diffusion terminée pour "${endedParty.title}". Le vote est ouvert pendant 1h.`
    : `✅ Diffusion annulée pour "${endedParty.title}".`;
}

export async function handleCinemaCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.reply({ ...buildCinemaMainMenu(), flags: MessageFlags.Ephemeral });
}

function buildMediaTypeSelect(customId: string) {
  return new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder("Film ou série ?")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Film").setValue("movie").setEmoji("🎬"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Série").setValue("tv").setEmoji("📺"),
    );
}

export async function handleCinemaMenu(interaction: StringSelectMenuInteraction): Promise<void> {
  const value = interaction.values[0];

  if (value === "start") {
    await interaction.update({
      content: "📅 **Programmer une diffusion** — Film ou série ?",
      embeds: [],
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          buildMediaTypeSelect(CINEMA_TYPE_SELECT_START_ID),
        ),
        buildCinemaBackRow(),
      ],
    });
    return;
  }

  if (value === "end") {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.update({ content: "❌ Cette action doit être effectuée dans un serveur.", embeds: [], components: [] });
      return;
    }

    const parties = await findActiveCinemaPartiesByGuild(guildId);
    const upcoming = [...parties].sort(
      (a, b) => new Date(a.viewingAt).getTime() - new Date(b.viewingAt).getTime(),
    );

    if (upcoming.length === 0) {
      await interaction.update({
        content: "ℹ️ Aucune diffusion active pour le moment.",
        embeds: [],
        components: [buildCinemaBackRow()],
      });
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(CINEMA_END_SELECT_ID)
      .setPlaceholder("Choisir une diffusion…")
      .addOptions(
        upcoming.map((p) => {
          const typeEmoji = p.mediaType === "movie" ? "🎬" : "📺";
          const ts = Math.floor(new Date(p.viewingAt).getTime() / 1000);
          const dateStr = new Date(p.viewingAt).toLocaleString("fr-FR", {
            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
          });
          return new StringSelectMenuOptionBuilder()
            .setLabel(p.title.slice(0, 100))
            .setValue(p.messageId)
            .setDescription(dateStr.slice(0, 100))
            .setEmoji(typeEmoji);
        }),
      );

    await interaction.update({
      content: "⏹️ **Terminer une diffusion** — Laquelle ?",
      embeds: [],
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
        buildCinemaBackRow(),
      ],
    });
    return;
  }

  if (value === "help") {
    await interaction.update({
      content: "",
      embeds: [buildCinemaHelpEmbed()],
      components: [buildCinemaBackRow()],
    });
    return;
  }
}

// ── Sélection du type → ouverture du modal ────────────────────────────────────

export async function handleCinemaStartTypeSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const type = interaction.values[0] as "movie" | "tv";

  // Date et heure courantes en heure de Paris
  const nowParis = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const dd   = String(nowParis.getDate()).padStart(2, "0");
  const mm   = String(nowParis.getMonth() + 1).padStart(2, "0");
  const yy   = String(nowParis.getFullYear()).slice(-2);
  const plus5 = new Date(nowParis.getTime() + 5 * 60 * 1000);
  const hh   = String(plus5.getHours()).padStart(2, "0");
  const min  = String(plus5.getMinutes()).padStart(2, "0");
  const todayStr = `${dd}/${mm}/${yy}`;
  const timeStr  = `${hh}:${min}`;

  const modal = new ModalBuilder()
    .setCustomId(`${CINEMA_MODAL_START_PREFIX}${type}`)
    .setTitle(type === "movie" ? "🎬 Programmer un film" : "📺 Programmer une série");

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId(CINEMA_INPUT_TITLE_ID)
        .setLabel("Titre")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Ex: Inception, Breaking Bad…")
        .setRequired(true)
        .setMaxLength(100),
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId(CINEMA_INPUT_DATE_ID)
        .setLabel("Date (JJ/MM/AA)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`Ex: ${todayStr}`)
        .setValue(todayStr)
        .setRequired(true)
        .setMaxLength(10),
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId(CINEMA_INPUT_TIME_ID)
        .setLabel("Heure (HH:MM)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`Ex: ${timeStr}`)
        .setValue(timeStr)
        .setRequired(true)
        .setMaxLength(5),
    ),
  );

  await interaction.showModal(modal);
}

export async function handleCinemaLaunchButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: "❌ Cette action doit être effectuée dans un serveur.", flags: MessageFlags.Ephemeral });
    return;
  }

  const cinemaParty = await findCinemaPartyByMessageId(interaction.message.id);

  if (!cinemaParty || cinemaParty.status !== CINEMA_CONSTANTS.ACTIVE_STATUS) {
    await interaction.reply({ content: "❌ Cette diffusion n'existe plus ou est déjà terminée.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (!canEndCinemaParty(cinemaParty, interaction.user.id, interaction.member.permissions)) {
    await interaction.reply({
      content: "❌ Seul l'organisateur ou un administrateur/modérateur peut lancer la diffusion.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (cinemaParty.startAnnouncementMessageId) {
    await interaction.reply({ content: "ℹ️ La diffusion est déjà en cours.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await triggerCinemaStartAnnouncement(interaction.client, cinemaParty);
    await interaction.editReply({ content: "✅ Diffusion lancée !" });
  } catch (error) {
    logger.error("[cinema] handleCinemaLaunchButton error", { error });
    await interaction.editReply({ content: "❌ Une erreur est survenue." });
  }
}

export async function handleCinemaEndPartySelect(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.update({ content: "❌ Cette action doit être effectuée dans un serveur.", embeds: [], components: [] });
    return;
  }

  const messageId = interaction.values[0];
  const cinemaParty = await findCinemaPartyByMessageId(messageId);

  if (!cinemaParty) {
    await interaction.update({ content: "❌ Diffusion introuvable ou déjà terminée.", embeds: [], components: [] });
    return;
  }

  if (!canEndCinemaParty(cinemaParty, interaction.user.id, interaction.member.permissions)) {
    await interaction.update({
      content: "❌ Seul l'organisateur ou un administrateur/modérateur peut terminer cette diffusion.",
      embeds: [],
      components: [],
    });
    return;
  }

  await interaction.deferUpdate();

  try {
    const result = await performEndCinemaParty(interaction.client, interaction.guild, cinemaParty);
    await interaction.editReply({ content: result, embeds: [], components: [] });
  } catch (error) {
    logger.error("[cinema] handleCinemaEndPartySelect error", { error });
    await interaction.editReply({ content: "❌ Une erreur est survenue.", embeds: [], components: [] });
  }
}

export async function handleCinemaEndButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: "❌ Cette action doit être effectuée dans un serveur.", flags: MessageFlags.Ephemeral });
    return;
  }

  const cinemaParty = await findCinemaPartyByMessageId(interaction.message.id);

  if (!cinemaParty || cinemaParty.status !== CINEMA_CONSTANTS.ACTIVE_STATUS) {
    await interaction.reply({ content: "❌ Cette diffusion n'existe plus ou est déjà terminée.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (!canEndCinemaParty(cinemaParty, interaction.user.id, interaction.member.permissions)) {
    await interaction.reply({
      content: "❌ Seul l'organisateur ou un administrateur/modérateur peut terminer cette diffusion.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const result = await performEndCinemaParty(interaction.client, interaction.guild, cinemaParty);
    await interaction.editReply({ content: result });
  } catch (error) {
    logger.error("[cinema] handleCinemaEndButton error", { error });
    await interaction.editReply({ content: "❌ Une erreur est survenue." });
  }
}

export async function handleCinemaBack(interaction: ButtonInteraction): Promise<void> {
  await interaction.update(buildCinemaMainMenu());
}

export async function handleCinemaStartModal(interaction: ModalSubmitInteraction): Promise<void> {
  // Le type est encodé dans le customId : "cinema:modal:start:movie" | "cinema:modal:start:tv"
  const type  = interaction.customId.slice(CINEMA_MODAL_START_PREFIX.length) as "movie" | "tv";
  const title = interaction.fields.getTextInputValue(CINEMA_INPUT_TITLE_ID);
  const date  = interaction.fields.getTextInputValue(CINEMA_INPUT_DATE_ID);
  const time  = interaction.fields.getTextInputValue(CINEMA_INPUT_TIME_ID);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const result = await startCinemaParty({
      interaction: interaction as unknown as ChatInputCommandInteraction,
      type,
      title,
      date,
      time,
    });
    await interaction.editReply({ content: result.message });
  } catch (error) {
    logger.error("[cinema] handleCinemaStartModal error", { error });
    await interaction.editReply({ content: "❌ Une erreur est survenue pendant la programmation." });
  }
}


// ── Panel button handlers (persistent embed in text channel) ──────────────────

export async function handleCinemaPanelStartButton(interaction: ButtonInteraction): Promise<void> {
  await interaction.reply({
    content: "📅 **Programmer une diffusion** — Film ou série ?",
    embeds: [],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        buildMediaTypeSelect(CINEMA_TYPE_SELECT_START_ID),
      ),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleCinemaPanelEndButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: "❌ Cette action doit être effectuée dans un serveur.", flags: MessageFlags.Ephemeral });
    return;
  }

  const { guildId } = interaction;
  const parties = await findActiveCinemaPartiesByGuild(guildId);
  const upcoming = [...parties].sort(
    (a, b) => new Date(a.viewingAt).getTime() - new Date(b.viewingAt).getTime(),
  );

  if (upcoming.length === 0) {
    await interaction.reply({
      content: "ℹ️ Aucune diffusion active pour le moment.",
      embeds: [],
      components: [],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(CINEMA_END_SELECT_ID)
    .setPlaceholder("Choisir une diffusion…")
    .addOptions(
      upcoming.map((p) => {
        const typeEmoji = p.mediaType === "movie" ? "🎬" : "📺";
        const dateStr = new Date(p.viewingAt).toLocaleString("fr-FR", {
          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
        });
        return new StringSelectMenuOptionBuilder()
          .setLabel(p.title.slice(0, 100))
          .setValue(p.messageId)
          .setDescription(dateStr.slice(0, 100))
          .setEmoji(typeEmoji);
      }),
    );

  await interaction.reply({
    content: "⏹️ **Terminer une diffusion** — Laquelle ?",
    embeds: [],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleCinemaPanelHelpButton(interaction: ButtonInteraction): Promise<void> {
  await interaction.reply({
    content: "",
    embeds: [buildCinemaHelpEmbed()],
    components: [],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleCinemaRatingButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: "❌ Cette action doit être effectuée dans un serveur.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const ratingStr = interaction.customId.slice(CINEMA_CONSTANTS.RATING_BUTTON_PREFIX.length);
  const rating = Number(ratingStr) as CinemaRatingValue;

  if (!rating || rating < 1 || rating > 5) {
    await interaction.reply({
      content: "❌ Note invalide.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const messageId = interaction.message.id;
  const userId = interaction.user.id;

  const cinemaParty = await findCinemaPartyByRatingMessageId(messageId);

  if (!cinemaParty) {
    await interaction.reply({
      content: "❌ Cette session de vote n'existe plus.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const currentRating = cinemaParty.ratings?.[userId];

  if (currentRating === rating) {
    const updated = await removeCinemaPartyUserRating({
      ratingMessageId: messageId,
      userId,
    });

    if (!updated) {
      await interaction.reply({
        content: "❌ Impossible de supprimer ta note.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      content: "✅ Note retirée.",
      flags: MessageFlags.Ephemeral,
    });

    logger.info("Cinema rating removed", {
      guildId: interaction.guild.id,
      messageId,
      userId,
      title: updated.title,
      rating,
    });
  } else {
    const updated = await setCinemaPartyUserRating({
      ratingMessageId: messageId,
      userId,
      rating,
    });

    if (!updated) {
      await interaction.reply({
        content: "❌ Impossible d'enregistrer ta note.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const stars = "⭐".repeat(rating);

    await interaction.reply({
      content: `✅ Note enregistrée : ${stars}`,
      flags: MessageFlags.Ephemeral,
    });

    logger.info("Cinema rating stored", {
      guildId: interaction.guild.id,
      messageId,
      userId,
      title: updated.title,
      rating,
    });
  }
}