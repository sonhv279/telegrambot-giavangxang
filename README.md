# Bot Giá Vàng Xăng

Telegram bot theo dõi giá vàng và giá xăng dầu Việt Nam, thiết kế để chạy trên Vercel bằng webhook + cron endpoint.

## Kiến Trúc Vercel

- Telegram update đi vào `POST /api/telegram` qua webhook.
- Scheduler chạy qua `GET /api/cron/tick`.
- Database dùng Postgres qua `DATABASE_URL`.
- Không dùng SQLite trên Vercel vì filesystem serverless không bền vững.
- Không chạy `bot.launch()` polling trên Vercel.

## Biến Môi Trường

Cấu hình trên Vercel Project Settings > Environment Variables:

```env
BOT_TOKEN=your_telegram_bot_token
DATABASE_URL=postgresql://...
PUBLIC_APP_URL=https://your-vercel-app.vercel.app
CRON_SECRET=some-long-random-secret
TZ=Asia/Ho_Chi_Minh
LOG_LEVEL=info
DEMO_MODE=true
GOLD_DEFAULT_THRESHOLD=200000
GOLD_SPREAD_THRESHOLD=300000
```

Database free gợi ý:

- Neon Postgres
- Supabase Postgres
- Vercel Postgres nếu tài khoản của bạn còn hỗ trợ

## Deploy Vercel

1. Push source lên GitHub.
2. Import repo vào Vercel.
3. Thêm environment variables ở trên.
4. Deploy.
5. Gọi endpoint setup webhook:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-vercel-app.vercel.app/api/setup-webhook
```

6. Mở Telegram và gửi `/start` cho bot.

## Cron

`vercel.json` cấu hình một cron duy nhất:

```text
/api/cron/tick mỗi phút
```

Endpoint này tự quyết định:

- Khi nào crawl vàng.
- Khi nào crawl xăng dầu.
- Khi nào gửi daily digest 09:00 Asia/Ho_Chi_Minh.

Nếu Vercel Free/Hobby giới hạn cron theo tài khoản của bạn, dùng cron miễn phí bên ngoài để gọi endpoint này mỗi phút:

- cron-job.org
- UptimeRobot
- GitHub Actions schedule

URL cần gọi:

```text
https://your-vercel-app.vercel.app/api/cron/tick
```

Header:

```text
Authorization: Bearer your-cron-secret
```

## Local Development

```bash
npm install
npm test
npm run build
npm run db:migrate
```

Local polling vẫn có thể chạy bằng:

```bash
npm run dev
```

Nhưng production trên Vercel dùng webhook, không dùng polling.

## Secret Safety

Không commit:

- `.env`
- token bot
- database URL thật
- log runtime

File `.env.example` chỉ là mẫu và không được chứa secret.
