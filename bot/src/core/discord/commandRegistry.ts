import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import { watchCommand } from "../../features/watch/commands/watch.command.js";
import { valorantCommand } from "../../features/valorant/commands/valorant.command.js";
import { selfRoleCommand } from "../../features/selfrole/commands/selfrole.command.js";
import { rouletteCommand } from "../../features/roulette/commands/roulette.command.js";

export type AppCommand = {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

export const commandRegistry = new Map<string, AppCommand>([
  [watchCommand.data.name, watchCommand],
  [valorantCommand.data.name, valorantCommand],
  [selfRoleCommand.data.name, selfRoleCommand],
  [rouletteCommand.data.name, rouletteCommand],
]);

export function getCommand(name: string): AppCommand | undefined {
  return commandRegistry.get(name);
}
