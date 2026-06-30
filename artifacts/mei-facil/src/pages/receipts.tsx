import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetReceipts,
  useCreateReceipt,
  useDeleteReceipt,
  type Receipt,
} from "@workspace/api-client-react";
import { useGetProfile } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Receipt as ReceiptIcon, Plus, Trash2, Printer, FileText } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { maskCpf, maskCnpj, onlyDigits, maskCurrency, currencyToNumber } from "@/lib/masks";

const receiptFormSchema = z.object({
  clientName: z.string().min(2, "Nome do cliente obrigatório"),
  clientCpfCnpj: z.string().optional(),
  description: z.string().min(3, "Descrição obrigatória"),
  amountMasked: z.string().min(1, "Valor obrigatório"),
  date: z.string().min(1, "Data obrigatória"),
  notes: z.string().optional(),
});

type ReceiptFormValues = z.infer<typeof receiptFormSchema>;

function formatCpfCnpj(val: string) {
  const digits = onlyDigits(val);
  if (digits.length <= 11) return maskCpf(digits);
  return maskCnpj(digits);
}

function printReceipt(receipt: Receipt, issuerName: string, issuerCnpj: string) {
  const win = window.open("", "_blank", "width=600,height=800");
  if (!win) return;

  const dateFormatted = new Date(receipt.date + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const amountFormatted = receipt.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const amountWords = receipt.amount.toFixed(2).replace(".", ",");

  win.document.write(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Recibo Nº ${receipt.number}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 14px; color: #111; padding: 40px; }
  .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; font-weight: bold; }
  .header p { font-size: 13px; color: #555; margin-top: 4px; }
  .number { font-size: 16px; font-weight: bold; text-align: right; margin-bottom: 20px; color: #555; }
  .amount-box { border: 2px solid #333; padding: 16px 24px; text-align: center; margin: 24px 0; }
  .amount-box .value { font-size: 28px; font-weight: bold; color: #1a1a1a; }
  .amount-box .label { font-size: 12px; color: #666; margin-bottom: 4px; }
  .field { margin-bottom: 14px; }
  .field-label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
  .field-value { font-size: 14px; margin-top: 2px; }
  .signature { margin-top: 60px; border-top: 1px solid #333; padding-top: 8px; text-align: right; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #ddd; padding-top: 12px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <h1>RECIBO</h1>
    <p>${issuerName} — CNPJ: ${issuerCnpj || "—"}</p>
    <p>Microempreendedor Individual</p>
  </div>

  <div class="number">Nº ${String(receipt.number).padStart(4, "0")}</div>

  <div class="amount-box">
    <div class="label">Valor Recebido</div>
    <div class="value">${amountFormatted}</div>
  </div>

  <div class="field">
    <div class="field-label">Recebi de</div>
    <div class="field-value">${receipt.clientName}${receipt.clientCpfCnpj ? ` — CPF/CNPJ: ${receipt.clientCpfCnpj}` : ""}</div>
  </div>

  <div class="field">
    <div class="field-label">Referente a</div>
    <div class="field-value">${receipt.description}</div>
  </div>

  <div class="field">
    <div class="field-label">Data</div>
    <div class="field-value">${dateFormatted}</div>
  </div>

  ${receipt.notes ? `<div class="field"><div class="field-label">Observações</div><div class="field-value">${receipt.notes}</div></div>` : ""}

  <div class="signature">
    <p style="font-size:12px; color:#666; margin-bottom:4px;">Assinatura do prestador</p>
    <p style="font-weight: bold;">${issuerName}</p>
    ${issuerCnpj ? `<p style="font-size:12px; color:#666;">CNPJ: ${issuerCnpj}</p>` : ""}
  </div>

  <div class="footer">
    Gerado pelo MEI Fácil • ${new Date().toLocaleDateString("pt-BR")}
  </div>

  <script>window.onload = () => { window.print(); };<\/script>
</body>
</html>
  `);
  win.document.close();
}

export default function Receipts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: receipts, isLoading } = useGetReceipts();
  const { data: profile } = useGetProfile();
  const createReceipt = useCreateReceipt();
  const deleteReceipt = useDeleteReceipt();

  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptFormSchema),
    defaultValues: {
      clientName: "", clientCpfCnpj: "", description: "",
      amountMasked: "", date: new Date().toISOString().slice(0, 10), notes: "",
    },
    mode: "onBlur",
  });

  const onSubmit = (data: ReceiptFormValues) => {
    createReceipt.mutate(
      {
        clientName: data.clientName,
        clientCpfCnpj: data.clientCpfCnpj ? onlyDigits(data.clientCpfCnpj) : undefined,
        description: data.description,
        amount: currencyToNumber(data.amountMasked),
        date: data.date,
        notes: data.notes || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "Recibo criado com sucesso" });
          form.reset();
          setDialogOpen(false);
        },
        onError: () => toast({ title: "Erro ao criar recibo", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Excluir este recibo?")) return;
    deleteReceipt.mutate(id, {
      onSuccess: () => toast({ title: "Recibo excluído" }),
      onError: () => toast({ title: "Erro ao excluir recibo", variant: "destructive" }),
    });
  };

  const handlePrint = (receipt: Receipt) => {
    const issuerName = profile?.name ?? "MEI";
    const issuerCnpj = profile?.cnpj
      ? maskCnpj(profile.cnpj)
      : "";
    printReceipt(receipt, issuerName, issuerCnpj);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ReceiptIcon className="w-7 h-7 text-primary" />
            Recibos
          </h1>
          <p className="text-muted-foreground mt-1">Gere recibos profissionais e imprima em PDF.</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Recibo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar recibo</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <FormField control={form.control} name="clientName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do cliente</FormLabel>
                    <FormControl><Input placeholder="João da Silva" autoComplete="off" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="clientCpfCnpj" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF/CNPJ do cliente (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="000.000.000-00"
                        inputMode="numeric"
                        maxLength={18}
                        autoComplete="off"
                        value={field.value}
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        onChange={(e) => field.onChange(formatCpfCnpj(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição do serviço/produto</FormLabel>
                    <FormControl><Input placeholder="Prestação de serviço de design" autoComplete="off" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="amountMasked" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">R$</span>
                        <Input
                          placeholder="1.500"
                          inputMode="numeric"
                          className="pl-9"
                          autoComplete="off"
                          value={field.value}
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          onChange={(e) => field.onChange(maskCurrency(e.target.value))}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (opcional)</FormLabel>
                    <FormControl><Input placeholder="Informações adicionais" autoComplete="off" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createReceipt.isPending}>
                  Criar recibo
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : (receipts?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Nenhum recibo emitido ainda.</p>
            <p className="text-sm mt-1">Crie seu primeiro recibo clicando em "Novo Recibo".</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {receipts?.map(receipt => (
            <Card key={receipt.id}>
              <CardContent className="flex items-center gap-4 py-4 px-5">
                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary shrink-0">
                  <span className="text-xs font-medium">Nº</span>
                  <span className="font-bold text-sm">{String(receipt.number).padStart(3, "0")}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{receipt.clientName}</p>
                  <p className="text-sm text-muted-foreground truncate">{receipt.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(receipt.date + "T12:00:00").toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-primary">{formatCurrency(receipt.amount)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="icon" onClick={() => handlePrint(receipt)} title="Imprimir/PDF">
                    <Printer className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(receipt.id)} className="text-destructive hover:text-destructive" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
