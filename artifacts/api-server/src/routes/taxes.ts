import { Router } from "express";
import { db, taxesTable, revenueTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function enrichTax(tax: typeof taxesTable.$inferSelect) {
  const daysUntilDue = getDaysUntilDue(tax.dueDate);
  let status = tax.status;
  if (status === "pending" && daysUntilDue < 0) status = "overdue";
  return { ...tax, daysUntilDue, status };
}

router.get("/taxes/next-due", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const taxes = await db.select().from(taxesTable)
      .where(and(eq(taxesTable.userId, req.userId!), eq(taxesTable.status, "pending")))
      .orderBy(taxesTable.dueDate);

    const pending = taxes.find(t => getDaysUntilDue(t.dueDate) >= 0);
    if (!pending) {
      res.status(404).json({ error: "Nenhum DAS pendente encontrado" });
      return;
    }
    res.json(enrichTax(pending));
  } catch (err) {
    logger.error({ err }, "Get next due tax error");
    res.status(500).json({ error: "Erro ao buscar próximo DAS" });
  }
});

router.get("/taxes", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { year, status } = req.query;
    let conditions = [eq(taxesTable.userId, req.userId!)];
    if (year) conditions.push(sql`EXTRACT(YEAR FROM CAST(${taxesTable.dueDate} AS DATE)) = ${parseInt(year as string)}`);

    const taxes = await db.select().from(taxesTable).where(and(...conditions)).orderBy(sql`${taxesTable.dueDate} DESC`);
    const enriched = taxes.map(enrichTax);
    const filtered = status ? enriched.filter(t => t.status === status) : enriched;
    res.json(filtered);
  } catch (err) {
    logger.error({ err }, "List taxes error");
    res.status(500).json({ error: "Erro ao listar DAS" });
  }
});

router.post("/taxes", authMiddleware, async (req: AuthRequest, res) => {
  const { competence, dueDate, amount } = req.body;
  if (!competence || !dueDate || !amount) {
    res.status(400).json({ error: "Campos obrigatórios: competence, dueDate, amount" });
    return;
  }
  try {
    const [tax] = await db.insert(taxesTable).values({
      userId: req.userId!, competence, dueDate, amount: parseFloat(amount), status: "pending",
    }).returning();
    res.status(201).json(enrichTax(tax));
  } catch (err) {
    logger.error({ err }, "Create tax error");
    res.status(500).json({ error: "Erro ao criar DAS" });
  }
});

router.patch("/taxes/:id/pay", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const paidAt = req.body.paidAt || new Date().toISOString().split("T")[0];
    const [tax] = await db.update(taxesTable)
      .set({ status: "paid", paidAt, updatedAt: new Date() })
      .where(and(eq(taxesTable.id, id), eq(taxesTable.userId, req.userId!))).returning();
    if (!tax) { res.status(404).json({ error: "DAS não encontrado" }); return; }
    res.json(enrichTax(tax));
  } catch (err) {
    logger.error({ err }, "Mark tax paid error");
    res.status(500).json({ error: "Erro ao marcar DAS como pago" });
  }
});

router.post("/taxes/simulate-penalty", authMiddleware, async (req: AuthRequest, res) => {
  const { amount, daysLate } = req.body;
  if (!amount || daysLate === undefined) {
    res.status(400).json({ error: "Campos obrigatórios: amount, daysLate" });
    return;
  }
  const originalAmount = parseFloat(amount);
  const days = parseInt(daysLate);
  // Brazilian DAS penalty: 2% fine + 0.033% per day interest (Selic rate approximation)
  const fine = days > 0 ? originalAmount * 0.02 : 0;
  const interest = days > 0 ? originalAmount * 0.00033 * days : 0;
  const total = originalAmount + fine + interest;
  res.json({ originalAmount, fine, interest, total, daysLate: days });
});

export default router;
