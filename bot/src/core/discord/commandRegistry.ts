import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import { cinemaCommand } from "../../features/cinema/commands/cinema.command.js";
import { valorantCommand } from "../../features/valorant/commands/valorant.command.js";
import { selfRoleCommand } from "../../features/selfrole/commands/selfrole.command.js";
import { rouletteCommand } from "../../features/roulette/commands/roulette.command.js";
import { steamCommand } from "../../features/steam/commands/steam.command.js";

export type AppCommand = {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

export const commandRegistry = new Map<string, AppCommand>([
  [cinemaCommand.data.name, cinemaCommand],
  [valorantCommand.data.name, valorantCommand],
  [selfRoleCommand.data.name, selfRoleCommand],
  [rouletteCommand.data.name, rouletteCommand],
  [steamCommand.data.name, steamCommand],
]);

export function getCommand(name: string): AppCommand | undefined {
  return commandRegistry.get(name);
}
