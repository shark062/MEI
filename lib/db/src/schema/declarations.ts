import { pgTable, serial, integer, text, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const declarationChecklistTable = pgTable("declaration_checklist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  label: text("label").notNull(),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChecklistSchema = createInsertSchema(declarationChecklistTable).omit({
  id: true,
  createdAt: true,
});

export type InsertChecklist = z.infer<typeof insertChecklistSchema>;
export type DeclarationChecklist = typeof declarationChecklistTable.$inferSelect;
