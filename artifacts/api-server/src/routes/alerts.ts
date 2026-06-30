import { Router } from "express";
import { db, alertsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

router.get("/alerts", authMiddleware, async (req: AuthRequest, res) => {
  try {
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

export default router;
