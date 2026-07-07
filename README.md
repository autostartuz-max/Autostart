# YHQ Test — Telegram Mini App

Yo'l harakati qoidalari (haydovchilik guvohnomasi) imtihoniga tayyorlov ilovasi.
1-bosqich: poydevor + test yechish yadrosi + admin panel.

## Tuzilma (monorepo)

```
apps/api     — Backend (Express + Prisma + SQLite)
apps/web     — Mini App (React + Vite) — foydalanuvchi ilovasi
apps/admin   — Boshqaruv paneli (React + Vite)
```

## Ishga tushirish

```bash
npm install
npm run db:setup     # Prisma generate + migrate + seed (namunaviy savollar)
npm run dev          # api :4000, web :5173, admin :5174
```

Brauzerda:
- Mini App: http://localhost:5173
- Admin panel: http://localhost:5174  (login: `admin`, parol: `admin123`)

## Muhit

Dev'da SQLite ishlatiladi (`apps/api/prisma/dev.db`). Ishlab chiqarishda (production)
`apps/api/prisma/schema.prisma` da `provider = "postgresql"` ga o'zgartirib, PostgreSQL'ga o'tiladi.

## Telegram

Dev rejimida (`DEV_AUTH=1`) brauzerda soxta foydalanuvchi bilan ishlaydi — bot tokeni shart emas.
Telegram ichida sinash uchun `apps/api/.env` da `BOT_TOKEN` va `DEV_AUTH=0` qo'yiladi.
