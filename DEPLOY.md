# 🚀 Инструкция по деплою: Telegram NFT Gift Upgrader

Этот проект полностью настроен для быстрой публикации на **GitHub** и автоматического деплоя на **Vercel** (фронтенд) и **Render / Railway** (бэкенд).

---

## ⚡ ШАГ 1: Отправка проекта на GitHub (3 команды)

1. Открой [GitHub.com](https://github.com/new) и создай новый пустой репозиторий (например, `telegram-nft-gift-upgrader`).
   > ⚠️ **Важно**: При создании репозитория **НЕ** ставь галочки "Add a README file", ".gitignore", "License", так как они уже созданы в проекте.

2. Скопируй ссылку на свой репозиторий и выполни в терминале проекта три команды:

```bash
git remote add origin <ссылка_на_твой_github>
git branch -M main
git push -u origin main
```

*(Например: `git remote add origin https://github.com/yourusername/telegram-nft-gift-upgrader.git`)*

---

## 🌐 ШАГ 2: Деплой Бэкенда на Render или Railway

> Бэкенд рекомендуется развернуть первым, чтобы сразу получить его URL (например, `https://gift-upgrader-api.onrender.com`) для фронтенда.

### Вариант A: Render.com (Бесплатно / Рекомендуется)

1. Зарегистрируйся на [Render.com](https://render.com) через GitHub.
2. Нажми кнопку **«New +»** -> **«Web Service»**.
3. Выбери твой репозиторий на GitHub.
4. В настройках сервиса укажи:
   - **Name**: `gift-upgrader-backend`
   - **Region**: Frankfurt (EU) или любой ближайший
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npm run build:shared && cd packages/server && npx prisma db push --accept-data-loss && npx tsx prisma/seed.ts && npm run build
     ```
   - **Start Command**:
     ```bash
     cd packages/server && npm run start
     ```
5. В разделе **«Environment Variables»** добавь переменные:
   - `NODE_ENV` = `production`
   - `PORT` = `3001`
   - `BOT_TOKEN` = `твой_токен_бота_из_BotFather` *(для работы Telegram Stars и валидации initData)*
   - `CORS_ORIGIN` = `*`
6. Нажми **«Create Web Service»**. Render автоматически соберет проект, инициализирует базу данных с 80 проверенными Fragment NFT подарками и запустит сервер.
7. Скопируй полученный URL бэкенда (например, `https://gift-upgrader-backend.onrender.com`).

---

### Вариант B: Railway.app (Альтернатива в один клик)

1. Зайди на [Railway.app](https://railway.app), нажми **«New Project»** -> **«Deploy from GitHub repo»**.
2. Railway автоматически подхватит готовый [`Dockerfile`](./packages/server/Dockerfile).
3. Добавь переменную окружения `BOT_TOKEN` и нажми **Deploy**.

---

## 💎 ШАГ 3: Деплой Фронтенда на Vercel

1. Зайди на [Vercel.com](https://vercel.com) и войди через GitHub.
2. Нажми **«Add New...»** -> **«Project»**.
3. Импортируй созданный репозиторий `telegram-nft-gift-upgrader`.
4. В настройках проекта:
   - **Framework Preset**: `Vite`
   - **Root Directory**: оставь `./` *(в корне уже лежит готовый `vercel.json`)* либо выбери `packages/client`.
5. В разделе **«Environment Variables»** добавь:
   - **Name**: `VITE_API_URL`
   - **Value**: URL твоего бэкенда из Шага 2 (например, `https://gift-upgrader-backend.onrender.com`).
6. Нажми **«Deploy»**. Vercel скомпилирует приложение за 30-40 секунд и выдаст публичную ссылку: `https://your-app.vercel.app`.

---

## 🤖 ШАГ 4: Подключение Telegram Mini App (TMA)

1. Открой бота [@BotFather](https://t.me/BotFather) в Telegram.
2. Отправь команду `/newapp`.
3. Выбери своего бота.
4. Введи название и описание приложения (например: `Gift Upgrader NFT`).
5. Загрузи иконку 640x360 px (или любую картинку).
6. Когда BotFather попросит WebApp URL, отправь ссылку с Vercel:
   `https://your-app.vercel.app`
7. Задай короткое имя для запуска (например: `play`).
8. Готово! По ссылке `t.me/your_bot/play` или по кнопке меню твое приложение будет мгновенно открываться внутри Telegram с тактильной отдачей Haptic Feedback, привязкой аккаунта и оплатой Telegram Stars!

---

## 🛠️ Полезные команды для локальной разработки

- `npm run build` — полная сборка всех пакетов (shared, server, client)
- `npm run dev:server` — запуск бэкенда с горячей перезагрузкой (`http://localhost:3001`)
- `npm run dev:client` — запуск фронтенда Vite (`http://localhost:3000`)
- `npm run db:seed` — повторный сид базы данных официальными подарками Fragment
