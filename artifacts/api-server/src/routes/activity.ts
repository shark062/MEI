import { Router } from "express";
import { db, activityLogTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

router.get("/activity", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || "50"), 200);
    const logs = await db.select().from(activityLogTable)
      .where(eq(activityLogTable.userId, req.userId!))
      .orderBy(desc(activityLogTable.createdAt))
      .limit(limit);
    res.json(logs);
  } catch (err) {
    logger.error({ err }, "Get activity log error");
    res.status(500).json({ error: "Erro ao buscar log de atividades" });
  }
});

export default router;

// Helper to log activity from other routes
export async function logActivity(
  userId: number,
  action: string,
  entity?: string,
  entityId?: string,
  details?: string,
  ipAddress?: string
) {
  try {
    await db.insert(activityLogTable).values({
      userId,
      action,
      entity: entity || null,
      entityId: entityId || null,
      details: details || null,
      ipAddress: ipAddress || null,
    });
  } catch {
    // Activity logging is non-critical, swallow errors
  }
}
