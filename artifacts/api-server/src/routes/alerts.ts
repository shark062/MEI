import { Router } from "express";
import { db, alertsTable, revenueTable, taxesTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

export async function generateAutoAlerts(userId: number) {
  try {
    const today = new Date();
    const year = today.getFullYear();

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

    const existingAlerts = await db.select().from(alertsTable).where(
      and(eq(alertsTable.userId, userId), eq(alertsTable.isRead, false))
    );
    const existingTypes = new Set(existingAlerts.map(a => a.type));

    const alertsToCreate: Array<{ type: string; title: string; description: string; priority: string }> = [];

    // Alert: DAS overdue
    for (const tax of pendingTaxes) {
      const daysUntil = Math.ceil((new Date(tax.dueDate).getTime() - today.getTime()) / 86400000);
      const alertType = `das_overdue_${tax.id}`;
      const alertTypeSoon = `das_due_soon_${tax.id}`;

      if (daysUntil < 0 && !existingTypes.has(alertType)) {
        alertsToCreate.push({
          type: alertType,
          title: "DAS em atraso!",
          description: `Seu DAS de ${tax.competence} está atrasado há ${Math.abs(daysUntil)} dia(s). Valor: R$ ${tax.amount.toFixed(2)}. Pague agora para evitar multas.`,
          priority: "high",
        });
      } else if (daysUntil >= 0 && daysUntil <= 5 && !existingTypes.has(alertTypeSoon)) {
        alertsToCreate.push({
          type: alertTypeSoon,
          title: "DAS vence em breve",
          description: `Seu DAS de ${tax.competence} vence em ${daysUntil === 0 ? "hoje" : `${daysUntil} dia(s)`}. Valor: R$ ${tax.amount.toFixed(2)}.`,
          priority: daysUntil <= 2 ? "high" : "medium",
        });
      }
    }

    // Alert: 80% annual limit used
    if (usedPercent >= 80 && usedPercent < 100 && !existingTypes.has("limit_80")) {
      alertsToCreate.push({
        type: "limit_80",
        title: "80% do limite anual atingido",
        description: `Você utilizou ${usedPercent.toFixed(1)}% do seu limite anual de R$ ${annualLimit.toLocaleString("pt-BR")}. Atenção ao faturamento restante.`,
        priority: "medium",
      });
    }

    // Alert: 95% annual limit used
    if (usedPercent >= 95 && !existingTypes.has("limit_95")) {
      alertsToCreate.push({
        type: "limit_95",
        title: "Limite anual quase esgotado!",
        description: `Você utilizou ${usedPercent.toFixed(1)}% do limite anual. Apenas R$ ${(annualLimit - totalAnnual).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} restam. Consulte um contador.`,
        priority: "high",
      });
    }

    // Alert: 30 days without revenue
    const lastEntry = yearEntries.sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!lastEntry || Math.ceil((today.getTime() - new Date(lastEntry.date).getTime()) / 86400000) >= 30) {
      if (!existingTypes.has("no_revenue_30d")) {
        alertsToCreate.push({
          type: "no_revenue_30d",
          title: "30 dias sem faturamento",
          description: "Você está há mais de 30 dias sem registrar faturamento. Lembre-se de manter seus lançamentos em dia.",
          priority: "medium",
        });
      }
    }

    for (const alert of alertsToCreate) {
      await db.insert(alertsTable).values({
        userId,
        type: alert.type,
        title: alert.title,
        description: alert.description,
        priority: alert.priority,
        isRead: false,
      });
    }

    return alertsToCreate.length;
  } catch (err) {
    logger.error({ err }, "Generate auto alerts error");
    return 0;
  }
}

router.get("/alerts", authMiddleware, async (req: AuthRequest, res) => {
  try {
    await generateAutoAlerts(req.userId!);
    const { unreadOnly } = req.query;
    let conditions = [eq(alertsTable.userId, req.userId!)];
    if (unreadOnly === "true") conditions.push(eq(alertsTable.isRead, false));

    const alerts = await db.select().from(alertsTable).where(and(...conditions)).orderBy(alertsTable.createdAt);
    res.json(alerts.reverse());
  } catch (err) {
    logger.error({ err }, "List alerts error");
    res.status(500).json({ error: "Erro ao listar alertas" });
  }
});

router.patch("/alerts/:id/read", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const [alert] = await db.update(alertsTable)
      .set({ isRead: true })
      .where(and(eq(alertsTable.id, id), eq(alertsTable.userId, req.userId!))).returning();
    if (!alert) { res.status(404).json({ error: "Alerta não encontrado" }); return; }
    res.json(alert);
  } catch (err) {
    logger.error({ err }, "Mark alert read error");
    res.status(500).json({ error: "Erro ao marcar alerta como lido" });
  }
});

router.patch("/alerts/read-all", authMiddleware, async (req: AuthRequest, res) => {
  try {
    await db.update(alertsTable)
      .set({ isRead: true })
      .where(and(eq(alertsTable.userId, req.userId!), eq(alertsTable.isRead, false)));
    res.json({ message: "Todos os alertas marcados como lidos" });
  } catch (err) {
    logger.error({ err }, "Mark all alerts read error");
    res.status(500).json({ error: "Erro ao marcar alertas" });
  }
});

export default router;
