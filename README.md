# Meetlink

Meetlink is a Telegram scheduling app that helps groups quickly find a time that works for everyone.

## Try it now

Use the app directly in Telegram:

https://t.me/meetinglink_telebot/schedule

## Features

- Create a plan with title, date range, time window, timezone, slot length (15/30/60 min), and custom working days.
- Share one Telegram-friendly link so participants can join quickly.
- Let participants mark availability on a tap-and-drag grid (mobile and desktop).
- View results in a heatmap plus a ranked list of best time slots.
- Filter by participant and optionally hide participant names (privacy mode).
- Edit plan settings after publishing.
- Use Telegram share when available, with native share fallback.

## How it works

1. Create a new plan.
2. Share the plan link.
3. Participants select available times.
4. Meetlink highlights the strongest matching slots.

## Tech Stack

- Next.js 15 + TypeScript
- Turso (libSQL/SQLite) + Drizzle ORM
- Telegram Mini App SDK
- shadcn/ui + Tailwind CSS

## Why Turso

Turso was selected to keep Meetlink fast, simple, and inexpensive for a scheduling app that needs reliable reads/writes without heavyweight ops.

- SQLite-compatible: straightforward schema and local-style developer experience.
- Globally distributed reads: helps reduce latency for users in different regions.
- Serverless-friendly: pairs well with modern Next.js deployment workflows.
- Generous free tier: practical for early growth and hobby-to-production stages.
- Lower operational overhead: less setup/maintenance than managing a traditional database server.

## Who this is for

- Teams coordinating meetings
- Friends planning hangouts
- Communities organizing events
