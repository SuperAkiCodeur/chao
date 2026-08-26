import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { logger } from "../../../core/app/logger.js";
import {
  BIRTHDAY_CANCEL_DELETE_ID,
  BIRTHDAY_CONFIRM_DELETE_ID,
  BIRTHDAY_CONSTANTS,
  BIRTHDAY_INPUT_DATE_ID,
  BIRTHDAY_MODAL_SET_ID,
} from "../domain/birthday.constants.js";
import { validateBirthdayDate } from "../domain/birthday.validators.js";
import {
  deleteBirthday,
  findBirthdayByUserId,
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

function buildConfirmDeleteRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(BIRTHDAY_CONFIRM_DELETE_ID)
      .setLabel("Supprimer")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(BIRTHDAY_CANCEL_DELETE_ID)
      .setLabel("Annuler")
      .setStyle(ButtonStyle.Secondary),
  );
}

export async function handleBirthdayCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const existing = await findBirthdayByUserId(interaction.user.id);

  if (!existing) {
    await showBirthdaySetModal(interaction);
    return;
  }

  await interaction.reply({
    content: `🎂 Ton anniversaire est enregistré : **${formatBirthdayDate(existing.day, existing.month)}**. Veux-tu le supprimer ?`,
    components: [buildConfirmDeleteRow()],
    flags: MessageFlags.Ephemeral,
  });
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

export async function handleBirthdayConfirmDelete(interaction: ButtonInteraction): Promise<void> {
  await deleteBirthday(interaction.user.id);

  logger.info("[birthday] Birthday removed", { userId: interaction.user.id });

  await interaction.update({
    content: "✅ Ton anniversaire a été supprimé.",
    components: [],
  });
}

export async function handleBirthdayCancelDelete(interaction: ButtonInteraction): Promise<void> {
  await interaction.update({
    content: "❌ Suppression annulée.",
    components: [],
  });
}
