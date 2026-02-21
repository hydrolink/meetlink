import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

// ─── Plans ───────────────────────────────────────────────────────────────────
export const plans = sqliteTable(
  "plans",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    timezone: text("timezone").notNull(), // IANA e.g. "America/New_York"
    startDate: text("start_date").notNull(), // "YYYY-MM-DD"
    endDate: text("end_date").notNull(), // "YYYY-MM-DD"
    dayStartTime: text("day_start_time").notNull(), // "HH:MM" 24h
    dayEndTime: text("day_end_time").notNull(), // "HH:MM" 24h
    slotMinutes: integer("slot_minutes").notNull().default(30), // 15 | 30 | 60
    workingDays: text("working_days").notNull().default("[0,1,2,3,4,5,6]"), // JSON int array, 0=Sun
    maxParticipants: integer("max_participants"), // null = unlimited
    hideParticipants: integer("hide_participants", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at").notNull(), // unix timestamp seconds
    createdByTelegramId: text("created_by_telegram_id"),
    hostToken: text("host_token").notNull(), // nanoid, returned ONLY at creation time
  },
  (t) => [index("plans_created_by_idx").on(t.createdByTelegramId)]
);

// ─── Participants ─────────────────────────────────────────────────────────────
export const participants = sqliteTable(
  "participants",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    telegramUserId: text("telegram_user_id"),
    token: text("token").notNull(), // nanoid, stored in client localStorage
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    index("participants_plan_id_idx").on(t.planId),
    index("participants_token_idx").on(t.token),
    // Prevent duplicate Telegram user in same plan (SQLite allows multiple NULLs in unique index)
    uniqueIndex("participants_telegram_uniq").on(t.planId, t.telegramUserId),
  ]
);

// ─── Availability ─────────────────────────────────────────────────────────────
export const availability = sqliteTable(
  "availability",
  {
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    slotKey: text("slot_key").notNull(), // "YYYY-MM-DDTHH:MM" UTC
    available: integer("available", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [
    uniqueIndex("availability_pk").on(t.participantId, t.slotKey),
    index("availability_participant_idx").on(t.participantId),
    index("availability_slot_key_idx").on(t.slotKey),
  ]
);

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
export type Availability = typeof availability.$inferSelect;
export type NewAvailability = typeof availability.$inferInsert;
