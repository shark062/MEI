import { pgTable, serial, text, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  cpf: text("cpf").notNull().unique(),
  cnpj: text("cnpj").notNull().unique(),
  phone: text("phone"),
  openingDate: text("opening_date"),
  activity: text("activity"),
  category: text("category"),
  annualLimit: real("annual_limit").notNull().default(81000),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  refreshToken: text("refresh_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
