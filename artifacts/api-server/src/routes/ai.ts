import { Router } from "express";
import { db, aiConversationsTable, revenueTable, taxesTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

async function generateAiResponse(userId: number, message: string): Promise<string> {
  // Fetch context from DB to give relevant answers
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const annualLimit = user?.annualLimit ?? 81000;
  const year = new Date().getFullYear();

  const yearEntries = await db.select().from(revenueTable)
    .where(and(
      eq(revenueTable.userId, userId),
      sql`EXTRACT(YEAR FROM CAST(${revenueTable.date} AS DATE)) = ${year}`
    ));
  const totalAnnual = yearEntries.reduce((sum, e) => sum + e.amount, 0);
  const usedPercent = (totalAnnual / annualLimit) * 100;

  const pendingTaxes = await db.select().from(taxesTable)
    .where(and(eq(taxesTable.userId, userId), eq(taxesTable.status, "pending")))
    .orderBy(taxesTable.dueDate);
  const nextTax = pendingTaxes[0];

  const lowerMsg = message.toLowerCase();

  // Pattern-based responses using real data
  if (lowerMsg.includes("faturar") || lowerMsg.includes("limite") || lowerMsg.includes("quanto posso")) {
    const remaining = annualLimit - totalAnnual;
    const remainingFormatted = remaining.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const totalFormatted = totalAnnual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    if (usedPercent >= 100) {
      return `Atenção! Você já atingiu o limite anual do MEI de ${annualLimit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Seu faturamento atual é ${totalFormatted}. É urgente consultar um contador sobre seu enquadramento.`;
    }
    return `Seu faturamento atual em ${year} é de ${totalFormatted} (${usedPercent.toFixed(1)}% do limite). Você ainda pode faturar ${remainingFormatted} este ano antes de atingir o limite de ${annualLimit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`;
  }

  if (lowerMsg.includes("das") || lowerMsg.includes("imposto") || lowerMsg.includes("boleto") || lowerMsg.includes("vence")) {
    if (!nextTax) return "Não encontrei nenhum DAS pendente cadastrado. Acesse o módulo DAS para registrar seus pagamentos.";
    const dueDate = new Date(nextTax.dueDate);
    const today = new Date();
    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const dateFormatted = dueDate.toLocaleDateString("pt-BR");
    const amountFormatted = nextTax.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    if (daysUntil < 0) {
      return `Seu DAS de ${nextTax.competence} está ATRASADO há ${Math.abs(daysUntil)} dias! Valor: ${amountFormatted}. Pague o quanto antes para evitar multas.`;
    }
    return `Seu próximo DAS (${nextTax.competence}) vence em ${dateFormatted} — em ${daysUntil} dias. Valor: ${amountFormatted}.`;
  }

  if (lowerMsg.includes("perto do limite") || lowerMsg.includes("status") || lowerMsg.includes("situação")) {
    let statusMsg = "regular";
    if (usedPercent >= 100) statusMsg = "em risco de desenquadramento";
    else if (usedPercent >= 90) statusMsg = "em zona de risco (acima de 90%)";
    else if (usedPercent >= 70) statusMsg = "em atenção (acima de 70%)";
    return `Sua situação está ${statusMsg}. Faturamento em ${year}: ${totalAnnual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de ${annualLimit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} (${usedPercent.toFixed(1)}%).`;
  }

  if (lowerMsg.includes("declaração") || lowerMsg.includes("dasn") || lowerMsg.includes("anual")) {
    return `A Declaração Anual do Simples Nacional (DASN-SIMEI) deve ser entregue até 31 de maio de cada ano, referente ao ano anterior. No seu módulo de Declaração, você pode acompanhar o checklist e preparar os dados para o envio.`;
  }

  if (lowerMsg.includes("categoria") || lowerMsg.includes("atividade") || lowerMsg.includes("cnae")) {
    return `O MEI pode exercer atividades permitidas pela legislação (CNAE). Cada atividade tem um valor específico no DAS. Você pode verificar sua atividade cadastrada no seu Perfil. Para dúvidas sobre mudança de atividade, acesse o Portal do Empreendedor.`;
  }

  if (lowerMsg.includes("nota fiscal") || lowerMsg.includes("nf")) {
    return `Como MEI, você pode emitir Nota Fiscal de Serviço (NFS-e) pela prefeitura da sua cidade. Para produtos, alguns municípios permitem a NF-e. Guarde todas as notas no módulo de Documentos para facilitar sua declaração anual.`;
  }

  return `Olá! Sou o assistente MEI Fácil. Posso te ajudar com dúvidas sobre faturamento, DAS, limites, declaração anual e documentos. Exemplos de perguntas:\n• "Quanto posso faturar ainda este ano?"\n• "Quando vence meu próximo DAS?"\n• "Estou perto do limite?"\n• "O que é a declaração anual?"`;
}

router.post("/ai/chat", authMiddleware, async (req: AuthRequest, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    res.status(400).json({ error: "Mensagem é obrigatória" });
    return;
  }
  try {
    // Save user message
    await db.insert(aiConversationsTable).values({
      userId: req.userId!, role: "user", content: message,
    });

    // Generate contextual response
    const responseContent = await generateAiResponse(req.userId!, message);

    // Save assistant response
    const [assistantMsg] = await db.insert(aiConversationsTable).values({
      userId: req.userId!, role: "assistant", content: responseContent,
    }).returning();

    res.json(assistantMsg);
  } catch (err) {
    logger.error({ err }, "AI chat error");
    res.status(500).json({ error: "Erro ao processar mensagem" });
  }
});

router.get("/ai/conversations", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const conversations = await db.select().from(aiConversationsTable)
      .where(eq(aiConversationsTable.userId, req.userId!))
      .orderBy(aiConversationsTable.createdAt);
    res.json(conversations);
  } catch (err) {
    logger.error({ err }, "Get AI conversations error");
    res.status(500).json({ error: "Erro ao buscar conversas" });
  }
});

export default router;
