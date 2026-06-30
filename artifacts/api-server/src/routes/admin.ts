import { Router } from "express";
import { db, usersTable, revenueTable, alertsTable, activityLogTable } from "@workspace/db";
import { eq, sql, desc, gte } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger";
import type { Request, Response, NextFunction } from "express";

const router = Router();

const ADMIN_EMAIL = "admin@meifacil.dev";
const ADMIN_PASSWORD = "MeiFacil@Dev2024";
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "mei-facil-admin-secret-dev-2024";

interface AdminRequest extends Request {
  isAdmin?: boolean;
}

function adminMiddleware(req: AdminRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token de admin não fornecido" });
    return;
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as { admin: boolean };
    if (!decoded.admin) throw new Error("Not admin token");
    req.isAdmin = true;
    next();
  } catch {
    res.status(401).json({ error: "Token de admin inválido ou expirado" });
  }
}

router.post("/admin/login", (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email e senha são obrigatórios" });
    return;
  }
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Credenciais de admin inválidas" });
    return;
  }
  const adminToken = jwt.sign({ admin: true }, ADMIN_JWT_SECRET, { expiresIn: "8h" });
  res.json({ adminToken });
});

router.get("/admin/stats", adminMiddleware, async (_req: AdminRequest, res: Response) => {
  try {
    const [{ totalUsers }] = await db.select({ totalUsers: sql<number>`COUNT(*)` }).from(usersTable);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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
