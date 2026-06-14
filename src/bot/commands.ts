import type { Telegraf } from 'telegraf';
import { repositories } from '../container.js';
import { formatDailyDigest, formatFuelList, formatGoldBest, formatGoldList } from '../formatters/messages.js';
import { runFuelCrawl, runGoldCrawl } from '../services/crawlRunner.js';

const chatId = (ctx: any): string => String(ctx.chat?.id ?? '');

const ensureUser = (ctx: any) => repositories.users.upsertByTelegramChatId(chatId(ctx));

export const registerCommands = (bot: Telegraf): void => {
  bot.start(async (ctx) => {
    await ensureUser(ctx);
    await ctx.reply([
      'Bot theo dõi giá vàng và xăng dầu đã sẵn sàng.',
      '',
      'Daily digest được bật mặc định lúc 09:00.',
      'Dùng /help để xem lệnh.'
    ].join('\n'));
  });

  bot.help(async (ctx) => {
    await ensureUser(ctx);
    await ctx.reply([
      '/status - trạng thái bot',
      '/gold - giá vàng mới nhất',
      '/gold_best - nơi mua/bán vàng tốt nhất',
      '/fuel - giá xăng dầu mới nhất',
      '/threshold_gold 200000 - đổi ngưỡng alert vàng',
      '/daily_on - bật bản tin sáng',
      '/daily_off - tắt bản tin sáng',
      '/daily_status - trạng thái bản tin sáng',
      '/mute - tạm dừng thông báo',
      '/unmute - bật lại thông báo',
      '/sources - nguồn dữ liệu'
    ].join('\n'));
  });

  bot.command('status', async (ctx) => {
    const user = await ensureUser(ctx);
    const latestRuns = await repositories.crawlerRuns.latest();
    await ctx.reply([
      'Bot status: ok',
      `Muted: ${user.muted ? 'yes' : 'no'}`,
      `Daily digest: ${user.dailyDigestEnabled ? 'on' : 'off'} ${user.dailyDigestTime}`,
      `Gold threshold: ${await repositories.users.getGoldThreshold(user.id)}`,
      `Crawler runs tracked: ${latestRuns.length}`
    ].join('\n'));
  });

  bot.command('gold', async (ctx) => {
    await ensureUser(ctx);
    let snapshots = await repositories.snapshots.latestByType('gold');
    if (snapshots.length === 0) {
      await runGoldCrawl();
      snapshots = await repositories.snapshots.latestByType('gold');
    }
    await ctx.reply(formatGoldList(snapshots));
  });

  bot.command('gold_best', async (ctx) => {
    await ensureUser(ctx);
    const snapshots = await repositories.snapshots.latestByType('gold');
    await ctx.reply(formatGoldBest(snapshots));
  });

  bot.command('fuel', async (ctx) => {
    await ensureUser(ctx);
    let snapshots = await repositories.snapshots.latestByType('fuel');
    if (snapshots.length === 0) {
      await runFuelCrawl();
      snapshots = await repositories.snapshots.latestByType('fuel');
    }
    await ctx.reply(formatFuelList(snapshots));
  });

  bot.command('threshold_gold', async (ctx) => {
    const user = await ensureUser(ctx);
    const value = Number((ctx.message as any).text.split(/\s+/)[1]);
    if (!Number.isFinite(value) || value < 0) {
      await ctx.reply('Cú pháp: /threshold_gold 200000');
      return;
    }
    await repositories.users.setGoldThreshold(user.id, value);
    await ctx.reply(`Đã cập nhật ngưỡng alert vàng: ${value} VND/lượng`);
  });

  bot.command('daily_on', async (ctx) => {
    const user = await ensureUser(ctx);
    await repositories.users.setDailyDigest(user.id, true);
    await ctx.reply('Đã bật bản tin sáng 09:00.');
  });

  bot.command('daily_off', async (ctx) => {
    const user = await ensureUser(ctx);
    await repositories.users.setDailyDigest(user.id, false);
    await ctx.reply('Đã tắt bản tin sáng.');
  });

  bot.command('daily_status', async (ctx) => {
    const user = await ensureUser(ctx);
    await ctx.reply(`Daily digest: ${user.dailyDigestEnabled ? 'on' : 'off'} lúc ${user.dailyDigestTime}`);
  });

  bot.command('mute', async (ctx) => {
    const user = await ensureUser(ctx);
    await repositories.users.setMuted(user.id, true);
    await ctx.reply('Đã tạm dừng thông báo.');
  });

  bot.command('unmute', async (ctx) => {
    const user = await ensureUser(ctx);
    await repositories.users.setMuted(user.id, false);
    await ctx.reply('Đã bật lại thông báo.');
  });

  bot.command('sources', async (ctx) => {
    await ensureUser(ctx);
    await ctx.reply([
      'Nguồn dữ liệu hiện tại:',
      'Gold: PNJ API khu vực Hồ Chí Minh',
      'Fuel: GiaXangHomNay bảng Petrolimex vùng 1/vùng 2',
      '',
      'Lưu ý: mock data chỉ chạy local khi DEMO_MODE=true và NODE_ENV không phải production.'
    ].join('\n'));
  });

  bot.command('digest_preview', async (ctx) => {
    const user = await ensureUser(ctx);
    const gold = await repositories.snapshots.latestByType('gold');
    const fuel = await repositories.snapshots.latestByType('fuel');
    const message = formatDailyDigest(gold, fuel, user);
    await ctx.reply(message);
  });
};
