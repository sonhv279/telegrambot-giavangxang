import { env } from './config/env.js';
import './container.js';
import { createBot } from './bot/index.js';
import { telegramCommands } from './bot/botCommands.js';
import { ensureDatabase } from './container.js';
import { logger } from './logger/index.js';
import { startScheduler } from './scheduler/index.js';

const bot = createBot();

await ensureDatabase();
startScheduler(bot);

if (bot) {
  await bot.launch();
  await bot.telegram.setMyCommands(telegramCommands);
  logger.info('telegram bot launched');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
} else {
  logger.warn({ demoMode: env.demoMode }, 'BOT_TOKEN is empty; scheduler runs without Telegram sending');
}
