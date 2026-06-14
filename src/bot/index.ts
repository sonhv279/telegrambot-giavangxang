import { Telegraf } from 'telegraf';
import { env } from '../config/env.js';
import { registerCommands } from './commands.js';

export const createBot = (): Telegraf | null => {
  if (!env.botToken) return null;
  const bot = new Telegraf(env.botToken);
  registerCommands(bot);
  return bot;
};
