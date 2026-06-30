import { Router } from "express";
import { db, documentsTable } from "@workspace/db";
import { eq, and, like, or } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

router.get("/documents", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { folder, search } = req.query;
    let conditions = [eq(documentsTable.userId, req.userId!)];
    if (folder) conditions.push(eq(documentsTable.folder, folder as string));
    if (search) conditions.push(like(documentsTable.name, `%${search}%`));

    const docs = await db.select().from(documentsTable).where(and(...conditions)).orderBy(documentsTable.createdAt);
    res.json(docs);
  } catch (err) {
    logger.error({ err }, "List documents error");
    res.status(500).json({ error: "Erro ao listar documentos" });
  }
});

router.post("/documents", authMiddleware, async (req: AuthRequest, res) => {
  const { name, folder, fileType, fileSize, fileUrl, description } = req.body;
  if (!name || !folder || !fileType) {
    res.status(400).json({ error: "Campos obrigatórios: name, folder, fileType" });
    return;
  }
  try {
    const [doc] = await db.insert(documentsTable).values({
      userId: req.userId!, name, folder, fileType,
      fileSize: fileSize ? parseInt(fileSize) : null,
      fileUrl: fileUrl || null,
      description: description || null,
    }).returning();
    res.status(201).json(doc);
  } catch (err) {
    logger.error({ err }, "Upload document error");
    res.status(500).json({ error: "Erro ao salvar documento" });
  }
});

router.delete("/documents/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const [deleted] = await db.delete(documentsTable)
      .where(and(eq(documentsTable.id, id), eq(documentsTable.userId, req.userId!))).returning();
    if (!deleted) { res.status(404).json({ error: "Documento não encontrado" }); return; }
    res.json({ message: "Documento excluído com sucesso" });
  } catch (err) {
    logger.error({ err }, "Delete document error");
    res.status(500).json({ error: "Erro ao excluir documento" });
  }
});

export default router;
