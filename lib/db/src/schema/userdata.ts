import { jsonb, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const userDataTable = pgTable("user_data", {
  userId: varchar("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),

  // ─── v2: unified AppData document ──────────────────────────────────────────
  appData: jsonb("app_data"),
  schemaVersion: integer("schema_version").notNull().default(1),

  // ─── v1 legacy fields (kept for migration, not written by new code) ─────────
  currentWorkouts: jsonb("current_workouts").notNull().default([]),
  historyEntries: jsonb("history_entries").notNull().default([]),
  currentReflection: jsonb("current_reflection"),
  reflectionShownCount: text("reflection_shown_count").notNull().default("0"),
  motivationalDate: text("motivational_date"),
  motivationalLabel: text("motivational_label"),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UserData = typeof userDataTable.$inferSelect;
export type InsertUserData = typeof userDataTable.$inferInsert;
