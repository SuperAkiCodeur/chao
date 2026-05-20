import type {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
  } from "discord.js";
  import { watchCommand } from "../../features/watch/commands/watch.command.js";
  
  export type AppCommand = {
    data:
      | SlashCommandBuilder
      | SlashCommandOptionsOnlyBuilder
      | SlashCommandSubcommandsOnlyBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  };
  
  export const commandRegistry = new Map<string, AppCommand>([
    [watchCommand.data.name, watchCommand],
  ]);
  
  export function getCommand(name: string): AppCommand | undefined {
    return commandRegistry.get(name);
  }