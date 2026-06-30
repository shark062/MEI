import { Router } from "express";
import { db, meiScoreHistoryTable, revenueTable, taxesTable, documentsTable, alertsTable, usersTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

export async function calculateMeiScore(userId: number): Promise<{
  score: number;
  label: string;
  details: Record<string, number>;
}> {
  const year = new Date().getFullYear();
  const today = new Date();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const annualLimit = user?.annualLimit ?? 81000;

  const yearEntries = await db.select().from(revenueTable).where(
    and(
      eq(revenueTable.userId, userId),
      sql`EXTRACT(YEAR FROM CAST(${revenueTable.date} AS DATE)) = ${year}`
    )
  );

  const totalAnnual = yearEntries.reduce((s, e) => s + e.amount, 0);
  const usedPercent = (totalAnnual / annualLimit) * 100;

  const pendingTaxes = await db.select().from(taxesTable).where(
    and(eq(taxesTable.userId, userId), eq(taxesTable.status, "pending"))
  );
  const overdueTaxes = pendingTaxes.filter(t => new Date(t.dueDate) < today);

  const documents = await db.select().from(documentsTable).where(eq(documentsTable.userId, userId));

  const unreadAlerts = await db.select().from(alertsTable).where(
    and(eq(alertsTable.userId, userId), eq(alertsTable.isRead, false))
  );

  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const recentEntries = yearEntries.filter(e => new Date(e.date) >= lastMonth);

  // Score breakdown (each component = 0-20 points)
  // 1. Limit usage: best if 40-80%, penalty if >90% or 0%
  let limitScore = 20;
  if (usedPercent === 0) limitScore = 5;
  else if (usedPercent < 10) limitScore = 10;
  else if (usedPercent <= 80) limitScore = 20;
  else if (usedPercent <= 90) limitScore = 15;
  else limitScore = 5;

  // 2. No overdue taxes
  const taxScore = overdueTaxes.length === 0 ? 20 : Math.max(0, 20 - overdueTaxes.length * 10);

  // 3. Documents filed
  const docScore = documents.length >= 5 ? 20 : Math.min(20, documents.length * 4);

  // 4. Recent activity (launched revenue in last 30 days)
  const activityScore = recentEntries.length >= 2 ? 20 : recentEntries.length >= 1 ? 12 : 5;

  // 5. Profile completeness
  const profileScore = user?.name && user?.cpf && user?.cnpj && user?.activity ? 20 : 10;

  const totalScore = Math.round(limitScore + taxScore + docScore + activityScore + profileScore);

  let label = "Atenção";
  if (totalScore >= 90) label = "Excelente";
  else if (totalScore >= 70) label = "Regular";

  return {
    score: totalScore,
    label,
    details: {
      limitScore,
      taxScore,
      docScore,
      activityScore,
      profileScore,
    },
  };
}

router.get("/score", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await calculateMeiScore(req.userId!);

    await db.insert(meiScoreHistoryTable).values({
      userId: req.userId!,
      score: result.score,
      label: result.label,
      details: JSON.stringify(result.details),
    });

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Get MEI score error");
    res.status(500).json({ error: "Erro ao calcular pontuação" });
  }
});

router.get("/score/history", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const history = await db.select().from(meiScoreHistoryTable)
      .where(eq(meiScoreHistoryTable.userId, req.userId!))
      .orderBy(desc(meiScoreHistoryTable.calculatedAt))
      .limit(30);
    res.json(history);
  } catch (err) {
    logger.error({ err }, "Get score history error");
    res.status(500).json({ error: "Erro ao buscar histórico" });
  }
});

export default router;
