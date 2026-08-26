import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { logger } from "../../../core/app/logger.js";
import {
  BIRTHDAY_CANCEL_DELETE_ID,
  BIRTHDAY_CONFIRM_DELETE_ID,
  BIRTHDAY_CONSTANTS,
  BIRTHDAY_DAY_SELECT_PREFIX,
  BIRTHDAY_MONTH_SELECT_ID,
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

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// 2024 est bissextile, ce qui autorise le 29 février dans le sélecteur.
function daysInMonth(month: number): number {
  return new Date(2024, month, 0).getDate();
}

function buildMonthSelectRow(): ActionRowBuilder<StringSelectMenuBuilder> {
  const select = new StringSelectMenuBuilder()
    .setCustomId(BIRTHDAY_MONTH_SELECT_ID)
    .setPlaceholder("Choisis ton mois de naissance")
    .addOptions(
      BIRTHDAY_CONSTANTS.MONTH_NAMES.map((name, index) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(capitalize(name))
          .setValue(String(index + 1)),
      ),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

function buildDaySelectRows(month: number): ActionRowBuilder<StringSelectMenuBuilder>[] {
  const maxDay = daysInMonth(month);
  const midpoint = Math.min(16, maxDay);
  const customId = `${BIRTHDAY_DAY_SELECT_PREFIX}${month}`;

  const firstHalf = new StringSelectMenuBuilder()
    .setCustomId(`${customId}:1`)
    .setPlaceholder(`Jour (1–${midpoint})`)
    .addOptions(
      Array.from({ length: midpoint }, (_, i) =>
        new StringSelectMenuOptionBuilder().setLabel(String(i + 1)).setValue(String(i + 1)),
      ),
    );

  const rows = [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(firstHalf)];

  if (maxDay > midpoint) {
    const secondHalf = new StringSelectMenuBuilder()
      .setCustomId(`${customId}:2`)
      .setPlaceholder(`Jour (${midpoint + 1}–${maxDay})`)
      .addOptions(
        Array.from({ length: maxDay - midpoint }, (_, i) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(String(midpoint + 1 + i))
            .setValue(String(midpoint + 1 + i)),
        ),
      );

    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(secondHalf));
  }

  return rows;
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
    await interaction.reply({
      content: "🎂 Choisis ton mois de naissance :",
      components: [buildMonthSelectRow()],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({
    content: `🎂 Ton anniversaire est enregistré : **${formatBirthdayDate(existing.day, existing.month)}**. Veux-tu le supprimer ?`,
    components: [buildConfirmDeleteRow()],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleBirthdayMonthSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const month = Number(interaction.values[0]);

  await interaction.update({
    content: `📅 Mois : **${capitalize(BIRTHDAY_CONSTANTS.MONTH_NAMES[month - 1])}**. Choisis ton jour :`,
    components: buildDaySelectRows(month),
  });
}

export async function handleBirthdayDaySelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const month = Number(interaction.customId.slice(BIRTHDAY_DAY_SELECT_PREFIX.length).split(":")[0]);
  const day = Number(interaction.values[0]);

  const validation = validateBirthdayDate(day, month);

  if (!validation.success) {
    await interaction.update({ content: validation.message, components: [] });
    return;
  }

  if (!interaction.guildId) {
    await interaction.update({
      content: "❌ Cette commande doit être utilisée dans un serveur.",
      components: [],
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

  await interaction.update({
    content: `✅ Ton anniversaire est enregistré : **${formatBirthdayDate(day, month)}** 🎂`,
    components: [],
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
