import { pgTable, serial, integer, text, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const taxesTable = pgTable("taxes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  competence: text("competence").notNull(),
  dueDate: text("due_date").notNull(),
  amount: real("amount").notNull(),
  status: text("status").notNull().default("pending"),
  paidAt: text("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTaxSchema = createInsertSchema(taxesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTax = z.infer<typeof insertTaxSchema>;
export type Tax = typeof taxesTable.$inferSelect;
