import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import { cinemaCommand } from "../../features/cinema/commands/cinema.command.js";
import { rouletteCommand } from "../../features/roulette/commands/roulette.command.js";
import { birthdayCommand } from "../../features/birthday/commands/birthday.command.js";

export type AppCommand = {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

export const commandRegistry = new Map<string, AppCommand>([
  [cinemaCommand.data.name, cinemaCommand],
  [rouletteCommand.data.name, rouletteCommand],
  [birthdayCommand.data.name, birthdayCommand],
]);

export function getCommand(name: string): AppCommand | undefined {
  return commandRegistry.get(name);
}
