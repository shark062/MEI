import { Router } from "express";
import { db, receiptsTable, usersTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

router.get("/receipts", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const receipts = await db.select().from(receiptsTable)
      .where(eq(receiptsTable.userId, req.userId!))
      .orderBy(desc(receiptsTable.createdAt));
    res.json(receipts);
  } catch (err) {
    logger.error({ err }, "List receipts error");
    res.status(500).json({ error: "Erro ao listar recibos" });
  }
});

router.post("/receipts", authMiddleware, async (req: AuthRequest, res) => {
  const { clientName, clientCpfCnpj, description, amount, date, notes } = req.body;
  if (!clientName || !description || !amount || !date) {
    res.status(400).json({ error: "Campos obrigatórios: clientName, description, amount, date" });
    return;
  }
  try {
    const [lastReceipt] = await db.select().from(receiptsTable)
      .where(eq(receiptsTable.userId, req.userId!))
      .orderBy(desc(receiptsTable.number))
      .limit(1);
    const nextNumber = (lastReceipt?.number ?? 0) + 1;

    const [receipt] = await db.insert(receiptsTable).values({
      userId: req.userId!,
      clientName,
      clientCpfCnpj: clientCpfCnpj || null,
      description,
      amount: parseFloat(amount),
      date,
      number: nextNumber,
      notes: notes || null,
    }).returning();
    res.status(201).json(receipt);
  } catch (err) {
    logger.error({ err }, "Create receipt error");
    res.status(500).json({ error: "Erro ao criar recibo" });
  }
});

router.get("/receipts/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const [receipt] = await db.select().from(receiptsTable)
      .where(and(eq(receiptsTable.id, id), eq(receiptsTable.userId, req.userId!)))
      .limit(1);
    if (!receipt) { res.status(404).json({ error: "Recibo não encontrado" }); return; }
    res.json(receipt);
  } catch (err) {
    logger.error({ err }, "Get receipt error");
    res.status(500).json({ error: "Erro ao buscar recibo" });
  }
});

router.delete("/receipts/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const [deleted] = await db.delete(receiptsTable)
      .where(and(eq(receiptsTable.id, id), eq(receiptsTable.userId, req.userId!)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Recibo não encontrado" }); return; }
    res.json({ message: "Recibo excluído" });
  } catch (err) {
    logger.error({ err }, "Delete receipt error");
    res.status(500).json({ error: "Erro ao excluir recibo" });
  }
});

export default router;
