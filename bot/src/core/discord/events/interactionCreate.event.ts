import { Events, MessageFlags, type Interaction } from "discord.js";
import type { AppEvent } from "../types/appEvent.js";
import { logger } from "../../app/logger.js";
import { getCommand } from "../commandRegistry.js";
import { handleSelfRoleButton, isSelfRoleButton } from "../../../features/selfrole/services/selfrole.service.js";
import {
  handleCinemaRatingButton,
  handleCinemaTicketButton,
  handleCinemaLaunchButton,
  handleCinemaEndButton,
  handleCinemaMenu,
  handleCinemaBack,
  handleCinemaStartModal,
  handleCinemaStartTypeSelect,
  handleCinemaEndPartySelect,
  handleCinemaPanelStartButton,
  handleCinemaPanelEndButton,
  handleCinemaPanelHelpButton,
} from "../../../features/cinema/services/cinema.service.js";
import {
  CINEMA_CONSTANTS,
  CINEMA_MENU_ID,
  CINEMA_MODAL_START_PREFIX,
  CINEMA_TYPE_SELECT_START_ID,
  CINEMA_END_SELECT_ID,
  CINEMA_BACK_BTN_ID,
  CINEMA_PANEL_START_BTN_ID,
  CINEMA_PANEL_END_BTN_ID,
  CINEMA_PANEL_HELP_BTN_ID,
} from "../../../features/cinema/domain/cinema.constants.js";
import {
  handleRouletteSelect,
  handleRouletteLaunch,
  handleRouletteRetry,
  handleRouletteCancel,
  handleRouletteMenu,
  handleRouletteBack,
} from "../../../features/roulette/services/roulette.service.js";
import {
  ROULETTE_SELECT_ID,
  ROULETTE_LAUNCH_PREFIX,
  ROULETTE_RETRY_ID,
} from "../../../features/roulette/commands/roulette.command.js";
import {
  ROULETTE_MENU_ID,
  ROULETTE_BACK_BTN_ID,
} from "../../../features/roulette/domain/roulette.constants.js";
import {
  handleDealsMainMenu,
  handleDealsListSelect,
  handleDealsActionMenu,
  handleDealsAddResult,
  handleDealsRemoveSelect,
  handleDealsPriceSelect,
  handleDealsShareSelect,
  handleDealsCreateModal,
  handleDealsSearchModal,
  handleDealsBackMain,
  handleDealsBackList,
  handleDealsDeleteConfirm,
} from "../../../features/deals/services/deals.service.js";
import {
  DEALS_MAIN_MENU_ID,
  DEALS_LISTS_SELECT_ID,
  DEALS_CREATE_MODAL_ID,
  DEALS_BACK_MAIN_BTN_ID,
  DEALS_ACTION_PREFIX,
  DEALS_ADD_RESULT_PFX,
  DEALS_REMOVE_PFX,
  DEALS_PRICE_PFX,
  DEALS_SHARE_PFX,
  DEALS_SEARCH_MODAL_PFX,
  DEALS_BACK_LIST_PFX,
  DEALS_DELETE_PFX,
} from "../../../features/deals/domain/deals.constants.js";
import {
  handleValorantMenu,
  handleValorantBack,
  handleValorantLinkModal,
  handleValorantStatsSelect,
} from "../../../features/valorant/services/valorant.service.js";
import {
  VALORANT_MENU_ID,
  VALORANT_STATS_SELECT_ID,
  VALORANT_MODAL_LINK_ID,
  VALORANT_BACK_BTN_ID,
} from "../../../features/valorant/domain/valorant.constants.js";

export const interactionCreateEvent: AppEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,

  async execute(interaction: Interaction): Promise<void> {
    const id = "customId" in interaction ? (interaction.customId as string) : "";

    // ── Modal submit ───────────────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      try {
        if (id === DEALS_CREATE_MODAL_ID) {
          await handleDealsCreateModal(interaction);
        } else if (id.startsWith(DEALS_SEARCH_MODAL_PFX)) {
          await handleDealsSearchModal(interaction);
        } else if (id.startsWith(CINEMA_MODAL_START_PREFIX)) {
          await handleCinemaStartModal(interaction);
        } else if (id === VALORANT_MODAL_LINK_ID) {
          await handleValorantLinkModal(interaction);
        }
      } catch (err) {
        logger.error("Modal submit failed", { customId: id, err });
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: "❌ Une erreur est survenue. Réessaie." }).catch(() => null);
        } else {
          await interaction.reply({ content: "❌ Une erreur est survenue. Réessaie.", flags: MessageFlags.Ephemeral }).catch(() => null);
        }
      }
      return;
    }

    // ── User select menus ──────────────────────────────────────────────────────
    if (interaction.isUserSelectMenu()) {
      if (id.startsWith(DEALS_SHARE_PFX)) {
        await handleDealsShareSelect(interaction);
      } else if (id === ROULETTE_SELECT_ID) {
        await handleRouletteSelect(interaction);
      }
      return;
    }

    // ── String select menus ────────────────────────────────────────────────────
    if (interaction.isStringSelectMenu()) {
      if (id === DEALS_MAIN_MENU_ID) {
        await handleDealsMainMenu(interaction);
      } else if (id === DEALS_LISTS_SELECT_ID) {
        await handleDealsListSelect(interaction);
      } else if (id.startsWith(DEALS_ACTION_PREFIX)) {
        await handleDealsActionMenu(interaction);
      } else if (id.startsWith(DEALS_ADD_RESULT_PFX)) {
        await handleDealsAddResult(interaction);
      } else if (id.startsWith(DEALS_REMOVE_PFX)) {
        await handleDealsRemoveSelect(interaction);
      } else if (id.startsWith(DEALS_PRICE_PFX)) {
        await handleDealsPriceSelect(interaction);
      } else if (id === ROULETTE_MENU_ID) {
        await handleRouletteMenu(interaction);
      } else if (id === CINEMA_TYPE_SELECT_START_ID) {
        await handleCinemaStartTypeSelect(interaction);
      } else if (id === CINEMA_END_SELECT_ID) {
        await handleCinemaEndPartySelect(interaction);
      } else if (id === CINEMA_MENU_ID) {
        await handleCinemaMenu(interaction);
      } else if (id === VALORANT_MENU_ID) {
        await handleValorantMenu(interaction);
      } else if (id === VALORANT_STATS_SELECT_ID) {
        await handleValorantStatsSelect(interaction);
      }
      return;
    }

    // ── Buttons ────────────────────────────────────────────────────────────────
    if (interaction.isButton()) {
      if (id === DEALS_BACK_MAIN_BTN_ID) {
        await handleDealsBackMain(interaction);
      } else if (id.startsWith(DEALS_BACK_LIST_PFX)) {
        await handleDealsBackList(interaction);
      } else if (id.startsWith(DEALS_DELETE_PFX)) {
        await handleDealsDeleteConfirm(interaction);
      } else if (id === CINEMA_CONSTANTS.TICKET_BUTTON_ID) {
        await handleCinemaTicketButton(interaction);
      } else if (id === CINEMA_CONSTANTS.LAUNCH_BUTTON_ID) {
        await handleCinemaLaunchButton(interaction);
      } else if (id === CINEMA_CONSTANTS.END_BUTTON_ID) {
        await handleCinemaEndButton(interaction);
      } else if (id.startsWith(CINEMA_CONSTANTS.RATING_BUTTON_PREFIX)) {
        await handleCinemaRatingButton(interaction);
      } else if (isSelfRoleButton(id)) {
        await handleSelfRoleButton(interaction);
      } else if (id.startsWith(ROULETTE_LAUNCH_PREFIX)) {
        await handleRouletteLaunch(interaction);
      } else if (id === ROULETTE_RETRY_ID) {
        await handleRouletteRetry(interaction);
      } else if (id === "roulette:cancel") {
        await handleRouletteCancel(interaction);
      } else if (id === ROULETTE_BACK_BTN_ID) {
        await handleRouletteBack(interaction);
      } else if (id === CINEMA_BACK_BTN_ID) {
        await handleCinemaBack(interaction);
      } else if (id === CINEMA_PANEL_START_BTN_ID) {
        await handleCinemaPanelStartButton(interaction);
      } else if (id === CINEMA_PANEL_END_BTN_ID) {
        await handleCinemaPanelEndButton(interaction);
      } else if (id === CINEMA_PANEL_HELP_BTN_ID) {
        await handleCinemaPanelHelpButton(interaction);
      } else if (id === VALORANT_BACK_BTN_ID) {
        await handleValorantBack(interaction);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = getCommand(interaction.commandName);
    if (!command) {
      logger.warn("Command not found", { commandName: interaction.commandName });
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ Commande inconnue.", flags: MessageFlags.Ephemeral });
      }
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error("Command execution failed", {
        commandName: interaction.commandName,
        userId: interaction.user.id,
        guildId: interaction.guildId ?? null,
        error,
      });
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: "❌ Une erreur est survenue.", flags: MessageFlags.Ephemeral }).catch(() => null);
        return;
      }
      await interaction.reply({ content: "❌ Une erreur est survenue.", flags: MessageFlags.Ephemeral }).catch(() => null);
    }
  },
};
