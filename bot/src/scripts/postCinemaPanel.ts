/**
 * One-shot script — posts the cinema panel embed to the configured channel.
 * Run once via: fly ssh console -C "node /app/dist/scripts/postCinemaPanel.js"
 */
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
} from "discord.js";
import { env } from "../core/config/env.js";
import {
  CINEMA_CONSTANTS,
  CINEMA_PANEL_START_BTN_ID,
  CINEMA_PANEL_END_BTN_ID,
  CINEMA_PANEL_HELP_BTN_ID,
} from "../features/cinema/domain/cinema.constants.js";

const PANEL_CHANNEL_ID = "1506263857046487090";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
  console.log(`[postCinemaPanel] Logged in as ${client.user?.tag}`);

  const channel = await client.channels.fetch(PANEL_CHANNEL_ID).catch(() => null);

  if (!channel || !channel.isTextBased() || !("send" in channel)) {
    console.error(`[postCinemaPanel] Channel ${PANEL_CHANNEL_ID} not found or not text-based`);
    process.exit(1);
  }

  const embed = new EmbedBuilder()
    .setColor(CINEMA_CONSTANTS.DEFAULT_EMBED_COLOR)
    .setTitle("🎟️ Bienvenue à la billetterie !")
    .setDescription(
      "Programme une soirée, gère les diffusions en cours ou consulte l'aide.\n" +
      "Les réponses ne sont visibles que par toi.",
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CINEMA_PANEL_START_BTN_ID)
      .setLabel("Programmer une diffusion")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("📅"),
    new ButtonBuilder()
      .setCustomId(CINEMA_PANEL_END_BTN_ID)
      .setLabel("Terminer une diffusion")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⏹️"),
    new ButtonBuilder()
      .setCustomId(CINEMA_PANEL_HELP_BTN_ID)
      .setLabel("Aide")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("❓"),
  );

  await (channel as { send: Function }).send({ embeds: [embed], components: [row] });

  console.log("[postCinemaPanel] ✅ Panel posted successfully!");
  process.exit(0);
});

await client.login(env.DISCORD_TOKEN);
