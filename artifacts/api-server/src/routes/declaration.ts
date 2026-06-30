import { Router } from "express";
import { db, declarationChecklistTable, revenueTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

router.get("/declaration", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

    const entries = await db.select().from(revenueTable)
      .where(and(
        eq(revenueTable.userId, req.userId!),
        sql`EXTRACT(YEAR FROM CAST(${revenueTable.date} AS DATE)) = ${year}`
      ));

    const annualRevenue = entries.reduce((sum, e) => sum + e.amount, 0);
    const monthsWithData = new Set(entries.map(e => new Date(e.date).getMonth())).size;

    const checklist = await db.select().from(declarationChecklistTable)
      .where(and(eq(declarationChecklistTable.userId, req.userId!), eq(declarationChecklistTable.year, year)));

    const completedCount = checklist.filter(c => c.completed).length;
    const completionPercent = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;
    const status = completionPercent === 100 ? "completed" : completionPercent > 0 ? "in_progress" : "pending";

    res.json({ year, annualRevenue, monthsRegistered: monthsWithData, status, completionPercent });
  } catch (err) {
    logger.error({ err }, "Get declaration error");
    res.status(500).json({ error: "Erro ao buscar declaração" });
  }
});

router.get("/declaration/checklist", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

    let items = await db.select().from(declarationChecklistTable)
      .where(and(eq(declarationChecklistTable.userId, req.userId!), eq(declarationChecklistTable.year, year)));

    // Auto-create default checklist if empty
    if (items.length === 0) {
      const defaults = [
        "Dados pessoais conferidos",
        "Receitas do ano revisadas",
        "Guias DAS pagas verificadas",
        "Documentos organizados",
        "Pronto para envio ao DASN",
      ];
      items = await db.insert(declarationChecklistTable)
        .values(defaults.map(label => ({ userId: req.userId!, year, label, completed: false })))
        .returning();
    }

    res.json(items);
  } catch (err) {
    logger.error({ err }, "Get declaration checklist error");
    res.status(500).json({ error: "Erro ao buscar checklist" });
  }
});

router.patch("/declaration/checklist/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { completed } = req.body;
    const [item] = await db.update(declarationChecklistTable)
      .set({ completed })
      .where(and(eq(declarationChecklistTable.id, id), eq(declarationChecklistTable.userId, req.userId!))).returning();
    if (!item) { res.status(404).json({ error: "Item não encontrado" }); return; }
    res.json(item);
  } catch (err) {
    logger.error({ err }, "Update checklist error");
    res.status(500).json({ error: "Erro ao atualizar checklist" });
  }
});

export default router;
