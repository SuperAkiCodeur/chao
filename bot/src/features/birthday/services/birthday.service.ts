import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { logger } from "../../../core/app/logger.js";
import {
  BIRTHDAY_CONSTANTS,
  BIRTHDAY_INPUT_DATE_ID,
  BIRTHDAY_MODAL_SET_ID,
} from "../domain/birthday.constants.js";
import { validateBirthdayDate } from "../domain/birthday.validators.js";
import {
  deleteBirthday,
  findBirthdayByUserId,
  findBirthdaysByGuild,
  upsertBirthday,
} from "../repositories/birthday.repository.js";

function formatBirthdayDate(day: number, month: number): string {
  return `${day} ${BIRTHDAY_CONSTANTS.MONTH_NAMES[month - 1]}`;
}

async function showBirthdaySetModal(interaction: ChatInputCommandInteraction): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId(BIRTHDAY_MODAL_SET_ID)
    .setTitle("🎂 Ton anniversaire");

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId(BIRTHDAY_INPUT_DATE_ID)
        .setLabel("Date (JJ/MM)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Ex: 25/12")
        .setRequired(true)
        .setMaxLength(5),
    ),
  );

  await interaction.showModal(modal);
}

export async function handleBirthdaySetModal(interaction: ModalSubmitInteraction): Promise<void> {
  const dateInput = interaction.fields.getTextInputValue(BIRTHDAY_INPUT_DATE_ID).trim();
  const match = /^(\d{1,2})\/(\d{1,2})$/.exec(dateInput);

  if (!match) {
    await interaction.reply({
      content: "❌ Format invalide. Utilise JJ/MM (ex: 25/12).",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);

  const validation = validateBirthdayDate(day, month);

  if (!validation.success) {
    await interaction.reply({ content: validation.message, flags: MessageFlags.Ephemeral });
    return;
  }

  if (!interaction.guildId) {
    await interaction.reply({
      content: "❌ Cette commande doit être utilisée dans un serveur.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await upsertBirthday({
    userId: interaction.user.id,
    guildId: interaction.guildId,
    day,
    month,
  });

  logger.info("[birthday] Birthday set", { userId: interaction.user.id, day, month });

  await interaction.reply({
    content: `✅ Ton anniversaire est enregistré : **${formatBirthdayDate(day, month)}** 🎂`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleRemoveSubcommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const existing = await findBirthdayByUserId(interaction.user.id);

  if (!existing) {
    await interaction.reply({
      content: "ℹ️ Tu n'as pas d'anniversaire enregistré.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await deleteBirthday(interaction.user.id);

  logger.info("[birthday] Birthday removed", { userId: interaction.user.id });

  await interaction.reply({
    content: "✅ Ton anniversaire a été supprimé.",
    flags: MessageFlags.Ephemeral,
  });
}

async function handleListSubcommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: "❌ Cette commande doit être utilisée dans un serveur.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const birthdays = await findBirthdaysByGuild(interaction.guildId);

  if (birthdays.length === 0) {
    await interaction.reply({
      content: "ℹ️ Aucun anniversaire enregistré pour le moment.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const now = new Date();
  const dayOfYearKey = (month: number, day: number) => month * 100 + day;
  const todayKey = dayOfYearKey(now.getMonth() + 1, now.getDate());

  const sorted = [...birthdays].sort((a, b) => {
    const aKey = dayOfYearKey(a.month, a.day);
    const bKey = dayOfYearKey(b.month, b.day);
    const aDistance = aKey >= todayKey ? aKey - todayKey : aKey + 1300 - todayKey;
    const bDistance = bKey >= todayKey ? bKey - todayKey : bKey + 1300 - todayKey;
    return aDistance - bDistance;
  });

  const lines = sorted
    .slice(0, 15)
    .map((b) => `🎂 <@${b.userId}> — **${formatBirthdayDate(b.day, b.month)}**`);

  await interaction.reply({
    content: `**Prochains anniversaires**\n${lines.join("\n")}`,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleBirthdayCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "set") {
    await showBirthdaySetModal(interaction);
  } else if (subcommand === "supprimer") {
    await handleRemoveSubcommand(interaction);
  } else if (subcommand === "liste") {
    await handleListSubcommand(interaction);
  }
}
