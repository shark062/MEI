import { Router } from "express";
import { db, usersTable, revenueTable, alertsTable, activityLogTable } from "@workspace/db";
import { eq, sql, desc, gte } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

function adminOnly(req: AuthRequest, res: any, next: any) {
  // Admin check: userId === 1 or any future role system
  // For now, only the first registered user (id=1) has admin access
  if (req.userId !== 1) {
    res.status(403).json({ error: "Acesso restrito a administradores" });
    return;
  }
  next();
}

router.get("/admin/stats", authMiddleware, adminOnly, async (req: AuthRequest, res) => {
  try {
    const [{ totalUsers }] = await db.select({ totalUsers: sql<number>`COUNT(*)` }).from(usersTable);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    const [{ newUsers }] = await db.select({ newUsers: sql<number>`COUNT(*)` })
      .from(usersTable)
      .where(gte(usersTable.createdAt, thirtyDaysAgo));

    const year = new Date().getFullYear();
    const [{ totalRevenue }] = await db.select({ totalRevenue: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(revenueTable)
      .where(sql`EXTRACT(YEAR FROM CAST(${revenueTable.date} AS DATE)) = ${year}`);

    const [{ unreadAlerts }] = await db.select({ unreadAlerts: sql<number>`COUNT(*)` })
      .from(alertsTable)
      .where(eq(alertsTable.isRead, false));

    const recentActivity = await db.select().from(activityLogTable)
      .orderBy(desc(activityLogTable.createdAt))
      .limit(20);

    const recentUsers = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      createdAt: usersTable.createdAt,
      onboardingCompleted: usersTable.onboardingCompleted,
    }).from(usersTable)
      .orderBy(desc(usersTable.createdAt))
      .limit(10);

    res.json({
      totalUsers: Number(totalUsers),
      newUsers: Number(newUsers),
      totalRevenue: Number(totalRevenue),
      unreadAlerts: Number(unreadAlerts),
      recentActivity,
      recentUsers,
    });
  } catch (err) {
    logger.error({ err }, "Admin stats error");
    res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
});

export default router;
