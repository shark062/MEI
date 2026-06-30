import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

router.get("/profile", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    const { passwordHash, refreshToken, ...safeUser } = user;
    res.json({ ...safeUser, annualLimit: safeUser.annualLimit ?? 81000, onboardingCompleted: safeUser.onboardingCompleted ?? false });
  } catch (err) {
    logger.error({ err }, "Get profile error");
    res.status(500).json({ error: "Erro ao buscar perfil" });
  }
});

router.put("/profile", authMiddleware, async (req: AuthRequest, res) => {
  const { name, phone, openingDate, activity, category, annualLimit, onboardingCompleted } = req.body;
  try {
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (openingDate !== undefined) updateData.openingDate = openingDate;
    if (activity !== undefined) updateData.activity = activity;
    if (category !== undefined) updateData.category = category;
    if (annualLimit !== undefined) updateData.annualLimit = annualLimit;
    if (onboardingCompleted !== undefined) updateData.onboardingCompleted = onboardingCompleted;
    updateData.updatedAt = new Date();

    const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, req.userId!)).returning();
    const { passwordHash, refreshToken, ...safeUser } = user;
    res.json({ ...safeUser, annualLimit: safeUser.annualLimit ?? 81000, onboardingCompleted: safeUser.onboardingCompleted ?? false });
  } catch (err) {
    logger.error({ err }, "Update profile error");
    res.status(500).json({ error: "Erro ao atualizar perfil" });
  }
});

export default router;
