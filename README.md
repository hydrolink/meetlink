# Meetlink

A Telegram Mini App for scheduling polls. Create an availability poll with time slots, share a link, and let participants mark when they're free. Results show a heatmap + ranked best times.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Turso** (libSQL/SQLite) via Drizzle ORM — edge-distributed, generous free tier
- **Telegram Mini App SDK** (`@tma.js/sdk-react`)
- **shadcn/ui** + Tailwind CSS

## Features

- Host creates a plan: title, date range, time window, timezone, slot granularity (15/30/60 min), custom working days
- Participants join via Telegram deep link, mark availability on a tap-to-paint grid
- Drag to paint multiple cells at once (pointer events, works on mobile + desktop)
- Results: heatmap overlay + best-times ranked list + participant filter
- Privacy mode: hide participant names
- Host can edit plan settings after publish
- Shareable Telegram deep link + web link

## Getting Started

### 1. Create Turso Database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Log in
turso auth login

# Create database
turso db create meetlink

# Get credentials
turso db show meetlink --url       # → TURSO_DATABASE_URL
turso db tokens create meetlink    # → TURSO_AUTH_TOKEN
```

### 2. Set Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

```env
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_BOT_USERNAME=YourBotUsername
NEXT_PUBLIC_APP_NAME=meetlink
```

### 3. Push Database Schema

```bash
npx drizzle-kit push
```

### 4. Run Locally

```bash
npm install
npm run dev
```

> **Note:** Telegram Mini App features (expand, user info) only work inside the Telegram client. The app works as a normal web app when opened in a browser.

## Deployment (Vercel)

1. Push code to GitHub
2. Connect repo to [Vercel](https://vercel.com)
3. Add environment variables in Vercel project settings
4. Deploy — the `serverExternalPackages: ["@libsql/client"]` config in `next.config.ts` ensures Turso runs on Node.js runtime (not edge)

## Telegram Bot Setup

1. Open [@BotFather](https://t.me/BotFather) in Telegram
2. `/newbot` — create a bot, get `TELEGRAM_BOT_TOKEN`
3. `/newapp` — select your bot, set URL to your Vercel deployment
4. Note the app short name (set as `NEXT_PUBLIC_APP_NAME`)

### Deep Link Format

```
https://t.me/<BOT_USERNAME>/<APP_NAME>?startapp=<planId>
```

The `planId` is passed to the Mini App via `tgWebAppStartParam` and read with `useLaunchParams()`.

## Architecture

```
src/
├── app/
│   ├── layout.tsx          # TMA SDK init + Telegram script
│   ├── page.tsx            # Home/landing
│   ├── create/page.tsx     # Create plan form
│   ├── plan/[id]/
│   │   ├── page.tsx        # Plan view: join → availability → results
│   │   └── edit/page.tsx   # Host-only edit settings
│   └── api/plans/          # All API routes
├── components/
│   ├── slot-grid-selector.tsx   # Tap-to-paint availability grid
│   ├── results-heatmap.tsx      # Heatmap with intensity colors
│   ├── calendar-view.tsx        # Ranked best-times view
│   ├── participant-list.tsx     # Filter by participant
│   ├── create-plan-form.tsx     # Plan creation multi-section form
│   ├── timezone-selector.tsx    # Grouped IANA timezone combobox
│   └── share-button.tsx         # Telegram share + clipboard fallback
├── db/
│   ├── index.ts            # Turso client singleton
│   └── schema.ts           # Drizzle schema: plans, participants, availability
└── lib/
    ├── slots.ts            # Slot generation algorithm (UTC storage, DST-safe)
    ├── auth.ts             # Participant + host token validation
    ├── results.ts          # Aggregation, filtering, heatmap intensity
    └── utils.ts            # Session management (localStorage), formatters
```

## Data Model

- **plans**: id, title, description, timezone, date range, time window, slot config, host token
- **participants**: id, planId, displayName, telegramUserId, auth token
- **availability**: participantId × slotKey (UTC datetime) × available (bool)

Slots are computed on-the-fly from plan settings — not stored. `slotKey` is stored in UTC (`YYYY-MM-DDTHH:MM`) to eliminate DST ambiguity.

## Auth

Simple device-token auth:
- Joining a plan returns a `token` (nanoid) stored in `localStorage`
- All write requests include `Authorization: Bearer <token>`
- Host operations use the `hostToken` returned only at plan creation

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/plans` | None | Create plan, returns `{ id, hostToken }` |
| GET | `/api/plans/[id]` | None | Get plan + computed slots |
| PATCH | `/api/plans/[id]` | Host token | Update plan settings |
| POST | `/api/plans/[id]/participants` | None | Join plan |
| GET | `/api/plans/[id]/availability` | Participant token | Get my availability |
| POST | `/api/plans/[id]/availability` | Participant token | Save availability (batch upsert) |
| GET | `/api/plans/[id]/results` | None | Aggregated counts per slot |
