import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const receiptsTable = pgTable("receipts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  clientName: text("client_name").notNull(),
  clientCpfCnpj: text("client_cpf_cnpj"),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  date: text("date").notNull(),
  number: integer("number").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReceiptSchema = createInsertSchema(receiptsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receiptsTable.$inferSelect;
