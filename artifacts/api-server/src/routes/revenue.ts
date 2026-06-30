import { Router } from "express";
import { db, revenueTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

router.get("/revenue/stats", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    const annualLimit = user?.annualLimit ?? 81000;

    const allEntries = await db.select().from(revenueTable)
      .where(and(
        eq(revenueTable.userId, req.userId!),
        sql`EXTRACT(YEAR FROM CAST(${revenueTable.date} AS DATE)) = ${year}`
      ));

    const totalAnnual = allEntries.reduce((sum, e) => sum + e.amount, 0);
    const currentMonth = new Date().getMonth() + 1;
    const monthEntries = allEntries.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() + 1 === currentMonth;
    });
    const totalMonthly = monthEntries.reduce((sum, e) => sum + e.amount, 0);

    const monthsWithData = new Set(allEntries.map(e => new Date(e.date).getMonth())).size;
    const avgMonthly = monthsWithData > 0 ? totalAnnual / monthsWithData : 0;
    const projectedAnnual = avgMonthly * 12;
    const usedPercent = (totalAnnual / annualLimit) * 100;

    let alertLevel = "safe";
    if (usedPercent >= 100) alertLevel = "exceeded";
    else if (usedPercent >= 90) alertLevel = "danger";
    else if (usedPercent >= 70) alertLevel = "warning";

    res.json({ totalAnnual, totalMonthly, avgMonthly, projectedAnnual, usedPercent, annualLimit, monthsWithData, alertLevel });
  } catch (err) {
    logger.error({ err }, "Get revenue stats error");
    res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
});

router.get("/revenue/monthly", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const allEntries = await db.select().from(revenueTable)
      .where(and(
        eq(revenueTable.userId, req.userId!),
        sql`EXTRACT(YEAR FROM CAST(${revenueTable.date} AS DATE)) = ${year}`
      ));

    const monthlyMap: Record<number, number> = {};
    allEntries.forEach(e => {
      const month = new Date(e.date).getMonth() + 1;
      monthlyMap[month] = (monthlyMap[month] || 0) + e.amount;
    });

    const result = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      year,
      total: monthlyMap[i + 1] || 0,
      label: monthNames[i],
    }));

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Get monthly revenue error");
    res.status(500).json({ error: "Erro ao buscar faturamento mensal" });
  }
});

router.get("/revenue", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { month, year, category } = req.query;
    let conditions = [eq(revenueTable.userId, req.userId!)];

    if (year) conditions.push(sql`EXTRACT(YEAR FROM CAST(${revenueTable.date} AS DATE)) = ${parseInt(year as string)}`);
    if (month) conditions.push(sql`EXTRACT(MONTH FROM CAST(${revenueTable.date} AS DATE)) = ${parseInt(month as string)}`);
    if (category) conditions.push(eq(revenueTable.category, category as string));

    const entries = await db.select().from(revenueTable).where(and(...conditions)).orderBy(sql`${revenueTable.date} DESC`);
    const total = entries.reduce((sum, e) => sum + e.amount, 0);
    res.json({ entries, total });
  } catch (err) {
    logger.error({ err }, "List revenue error");
    res.status(500).json({ error: "Erro ao listar faturamento" });
  }
});

router.post("/revenue", authMiddleware, async (req: AuthRequest, res) => {
  const { amount, date, category, description } = req.body;
  if (!amount || !date || !category) {
    res.status(400).json({ error: "Campos obrigatórios: amount, date, category" });
    return;
  }
  try {
    const [entry] = await db.insert(revenueTable).values({
      userId: req.userId!, amount: parseFloat(amount), date, category, description: description || null,
    }).returning();
    res.status(201).json(entry);
  } catch (err) {
    logger.error({ err }, "Create revenue error");
    res.status(500).json({ error: "Erro ao criar lançamento" });
  }
});

router.get("/revenue/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const [entry] = await db.select().from(revenueTable)
      .where(and(eq(revenueTable.id, id), eq(revenueTable.userId, req.userId!))).limit(1);
    if (!entry) { res.status(404).json({ error: "Lançamento não encontrado" }); return; }
    res.json(entry);
  } catch (err) {
    logger.error({ err }, "Get revenue error");
    res.status(500).json({ error: "Erro ao buscar lançamento" });
  }
});

router.put("/revenue/:id", authMiddleware, async (req: AuthRequest, res) => {
  const { amount, date, category, description } = req.body;
  try {
    const id = parseInt(req.params.id as string);
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (date !== undefined) updateData.date = date;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;

    const [entry] = await db.update(revenueTable).set(updateData)
      .where(and(eq(revenueTable.id, id), eq(revenueTable.userId, req.userId!))).returning();
    if (!entry) { res.status(404).json({ error: "Lançamento não encontrado" }); return; }
    res.json(entry);
  } catch (err) {
    logger.error({ err }, "Update revenue error");
    res.status(500).json({ error: "Erro ao atualizar lançamento" });
  }
});

router.delete("/revenue/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const [deleted] = await db.delete(revenueTable)
      .where(and(eq(revenueTable.id, id), eq(revenueTable.userId, req.userId!))).returning();
    if (!deleted) { res.status(404).json({ error: "Lançamento não encontrado" }); return; }
    res.json({ message: "Lançamento excluído com sucesso" });
  } catch (err) {
    logger.error({ err }, "Delete revenue error");
    res.status(500).json({ error: "Erro ao excluir lançamento" });
  }
});

export default router;
