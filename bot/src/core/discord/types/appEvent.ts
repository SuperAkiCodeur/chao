import type { ClientEvents } from "discord.js";

export type AppEvent<K extends keyof ClientEvents> = {
  name: K;
  once?: boolean;
  execute: (...args: ClientEvents[K]) => Promise<void>;
};

export type AnyAppEvent = {
  [K in keyof ClientEvents]: AppEvent<K>;
}[keyof ClientEvents];