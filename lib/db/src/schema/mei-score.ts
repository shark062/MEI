import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const meiScoreHistoryTable = pgTable("mei_score_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  score: real("score").notNull(),
  label: text("label").notNull(),
  details: text("details"),
  calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
});

export const insertMeiScoreSchema = createInsertSchema(meiScoreHistoryTable).omit({
  id: true,
  calculatedAt: true,
});

export type InsertMeiScore = z.infer<typeof insertMeiScoreSchema>;
export type MeiScore = typeof meiScoreHistoryTable.$inferSelect;
