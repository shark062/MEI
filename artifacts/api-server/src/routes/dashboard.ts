import { Router } from "express";
import { db, revenueTable, taxesTable, alertsTable, usersTable } from "@workspace/db";
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

router.get("/dashboard/summary", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const year = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    const annualLimit = user?.annualLimit ?? 81000;

    // Annual revenue
    const yearEntries = await db.select().from(revenueTable)
      .where(and(
        eq(revenueTable.userId, req.userId!),
        sql`EXTRACT(YEAR FROM CAST(${revenueTable.date} AS DATE)) = ${year}`
      ));
    const annualRevenue = yearEntries.reduce((sum, e) => sum + e.amount, 0);

    // Monthly revenue
    const monthEntries = yearEntries.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() + 1 === currentMonth;
    });
    const monthlyRevenue = monthEntries.reduce((sum, e) => sum + e.amount, 0);

    // Projected annual
    const monthsWithData = new Set(yearEntries.map(e => new Date(e.date).getMonth())).size;
    const avgMonthly = monthsWithData > 0 ? annualRevenue / monthsWithData : 0;
    const projectedAnnual = avgMonthly * 12;

    // Usage percent and status
    const usedPercent = (annualRevenue / annualLimit) * 100;
    let status: "regular" | "attention" | "risk" = "regular";
    if (usedPercent >= 90) status = "risk";
    else if (usedPercent >= 70) status = "attention";

    // Next due DAS
    const allTaxes = await db.select().from(taxesTable)
      .where(and(eq(taxesTable.userId, req.userId!), eq(taxesTable.status, "pending")))
      .orderBy(taxesTable.dueDate);
    const nextDueTax = allTaxes.find(t => getDaysUntilDue(t.dueDate) >= -30) || allTaxes[0];
    const enrichedTax = nextDueTax
      ? { ...nextDueTax, daysUntilDue: getDaysUntilDue(nextDueTax.dueDate), status: getDaysUntilDue(nextDueTax.dueDate) < 0 ? "overdue" : "pending" }
      : null;

    // Unread alerts
    const unreadAlerts = await db.select().from(alertsTable)
      .where(and(eq(alertsTable.userId, req.userId!), eq(alertsTable.isRead, false)));

    res.json({
      annualRevenue,
      annualLimit,
      usedPercent,
      status,
      nextDueTax: enrichedTax,
      monthlyRevenue,
      unreadAlerts: unreadAlerts.length,
      projectedAnnual,
    });
  } catch (err) {
    logger.error({ err }, "Get dashboard summary error");
    res.status(500).json({ error: "Erro ao buscar resumo do dashboard" });
  }
});

export default router;
