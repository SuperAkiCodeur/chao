import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { SELFROLE_BUTTON_PREFIX } from "../services/selfrole.service.js";

const SELFROLE_EMBED_COLOR = 0x5865f2;

function parseHexColor(input: string | null): number | null {
  if (!input) return null;
  const cleaned = input.replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  return parseInt(cleaned, 16);
}

export const selfRoleCommand = {
  data: new SlashCommandBuilder()
    .setName("selfrole")
    .setDescription("Gestion des rôles en libre-service")
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Crée un message d'attribution de rôles dans un salon")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Salon où poster le message")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        )
        .addStringOption((opt) =>
          opt
            .setName("title")
            .setDescription("Titre de l'embed")
            .setRequired(true),
        )
        .addRoleOption((opt) =>
          opt.setName("role1").setDescription("Rôle 1").setRequired(true),
        )
        .addRoleOption((opt) =>
          opt.setName("role2").setDescription("Rôle 2").setRequired(false),
        )
        .addRoleOption((opt) =>
          opt.setName("role3").setDescription("Rôle 3").setRequired(false),
        )
        .addRoleOption((opt) =>
          opt.setName("role4").setDescription("Rôle 4").setRequired(false),
        )
        .addRoleOption((opt) =>
          opt.setName("role5").setDescription("Rôle 5").setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName("description")
            .setDescription("Description de l'embed (optionnel)")
            .setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName("color")
            .setDescription("Couleur de l'embed en hex (ex: #ff4655). Défaut : #5865f2")
            .setRequired(false),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: "❌ Cette commande doit être utilisée dans un serveur.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.options.getChannel("channel", true) as TextChannel;
    const title = interaction.options.getString("title", true);
    const description = interaction.options.getString("description");
    const colorInput = interaction.options.getString("color");
    const parsedColor = colorInput ? parseHexColor(colorInput) : null;

    if (colorInput && parsedColor === null) {
      await interaction.editReply({
        content: "❌ Couleur invalide. Utilise un code hex valide (ex: `#ff4655`).",
      });
      return;
    }

    const color = parsedColor ?? SELFROLE_EMBED_COLOR;

    const roles = [
      interaction.options.getRole("role1"),
      interaction.options.getRole("role2"),
      interaction.options.getRole("role3"),
      interaction.options.getRole("role4"),
      interaction.options.getRole("role5"),
    ].filter(Boolean);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title);

    if (description) {
      embed.setDescription(description);
    }

    const buttons = roles.map((role) =>
      new ButtonBuilder()
        .setCustomId(`${SELFROLE_BUTTON_PREFIX}${role!.id}`)
        .setLabel(role!.name)
        .setStyle(ButtonStyle.Secondary),
    );

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(i, i + 5)),
      );
    }

    try {
      const sent = await channel.send({ embeds: [embed], components: rows });

      logger.info("Self-role message created", {
        guildId: interaction.guildId,
        channelId: channel.id,
        messageId: sent.id,
        roles: roles.map((r) => r!.id),
      });

      await interaction.editReply({
        content: `✅ Message posté dans <#${channel.id}> !`,
      });
    } catch (error) {
      logger.error("Failed to post self-role message", {
        guildId: interaction.guildId,
        channelId: channel.id,
        error,
      });

      await interaction.editReply({
        content: "❌ Impossible de poster le message. Vérifie que le bot a accès à ce salon.",
      });
    }
  },
};
