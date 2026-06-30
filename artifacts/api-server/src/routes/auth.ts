import { Router } from "express";
import bcrypt from "bcrypt";
import { db, usersTable, declarationChecklistTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateTokens, verifyRefreshToken, authMiddleware, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

router.post("/auth/register", async (req, res) => {
  const { name, email, password, cpf, cnpj, phone } = req.body;
  if (!name || !email || !password || !cpf || !cnpj) {
    res.status(400).json({ error: "Campos obrigatórios: name, email, password, cpf, cnpj" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
    return;
  }
  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Email já cadastrado" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const { accessToken, refreshToken } = generateTokens(0); // temp
    const [user] = await db.insert(usersTable).values({
      name, email, passwordHash, cpf, cnpj, phone: phone || null,
      refreshToken,
    }).returning();

    // Generate proper tokens now that we have userId
    const tokens = generateTokens(user.id);
    await db.update(usersTable).set({ refreshToken: tokens.refreshToken }).where(eq(usersTable.id, user.id));

    // Seed default checklist for current year
    const year = new Date().getFullYear();
    await db.insert(declarationChecklistTable).values([
      { userId: user.id, year, label: "Dados pessoais conferidos", completed: false },
      { userId: user.id, year, label: "Receitas do ano revisadas", completed: false },
      { userId: user.id, year, label: "Guias DAS pagas verificadas", completed: false },
      { userId: user.id, year, label: "Documentos organizados", completed: false },
      { userId: user.id, year, label: "Pronto para envio ao DASN", completed: false },
    ]);

    const { passwordHash: _, refreshToken: __, ...safeUser } = user;
    res.status(201).json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { ...safeUser, annualLimit: safeUser.annualLimit ?? 81000, onboardingCompleted: safeUser.onboardingCompleted ?? false },
    });
  } catch (err) {
    logger.error({ err }, "Register error");
    res.status(500).json({ error: "Erro ao cadastrar usuário" });
  }
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email e senha são obrigatórios" });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }
    const tokens = generateTokens(user.id);
    await db.update(usersTable).set({ refreshToken: tokens.refreshToken }).where(eq(usersTable.id, user.id));
    const { passwordHash: _, refreshToken: __, ...safeUser } = user;
    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { ...safeUser, annualLimit: safeUser.annualLimit ?? 81000, onboardingCompleted: safeUser.onboardingCompleted ?? false },
    });
  } catch (err) {
    logger.error({ err }, "Login error");
    res.status(500).json({ error: "Erro ao fazer login" });
  }
});

router.post("/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: "Refresh token é obrigatório" });
    return;
  }
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, decoded.userId)).limit(1);
    if (!user || user.refreshToken !== refreshToken) {
      res.status(401).json({ error: "Token inválido" });
      return;
    }
    const tokens = generateTokens(user.id);
    await db.update(usersTable).set({ refreshToken: tokens.refreshToken }).where(eq(usersTable.id, user.id));
    const { passwordHash: _, refreshToken: __, ...safeUser } = user;
    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { ...safeUser, annualLimit: safeUser.annualLimit ?? 81000, onboardingCompleted: safeUser.onboardingCompleted ?? false },
    });
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
});

router.post("/auth/reset-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email é obrigatório" });
    return;
  }
  // In a real app, send an email with a reset link
  res.json({ message: "Se o email estiver cadastrado, você receberá as instruções em breve" });
});

export default router;
