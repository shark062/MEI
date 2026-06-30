import { useState } from "react";
import { 
  useListTaxes, 
  getListTaxesQueryKey, 
  useCreateTax, 
  useMarkTaxPaid, 
  useSimulatePenalty 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { PlusCircle, Calculator, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const taxSchema = z.object({
  competence: z.string().min(1, "Competência é obrigatória (MM/AAAA)"),
  dueDate: z.string().min(1, "Data de vencimento é obrigatória"),
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
});

const simulateSchema = z.object({
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  daysLate: z.coerce.number().min(1, "Dias de atraso deve ser maior que zero"),
});

type TaxForm = z.infer<typeof taxSchema>;
type SimulateForm = z.infer<typeof simulateSchema>;

export default function TaxesPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: taxes, isLoading } = useListTaxes();
  
  const createMutation = useCreateTax();
  const markPaidMutation = useMarkTaxPaid();
  const simulateMutation = useSimulatePenalty();

  const form = useForm<TaxForm>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      competence: "",
      dueDate: new Date().toISOString().split('T')[0],
      amount: 0,
    },
  });

  const simulateForm = useForm<SimulateForm>({
    resolver: zodResolver(simulateSchema),
    defaultValues: {
      amount: 0,
      daysLate: 1,
    },
  });

  const onSubmit = (data: TaxForm) => {
    createMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Sucesso", description: "Guia DAS registrada." });
        setIsAddOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListTaxesQueryKey() });
      }
    });
  };

  const onSimulateSubmit = (data: SimulateForm) => {
    simulateMutation.mutate({ data }, {
      onSuccess: (result) => {
        setSimulationResult(result);
      }
    });
  };

  const handleMarkPaid = (id: number) => {
    markPaidMutation.mutate({ 
      id, 
      data: { paidAt: new Date().toISOString().split('T')[0] } 
    }, {
      onSuccess: () => {
        toast({ title: "Sucesso", description: "DAS marcado como pago." });
        queryClient.invalidateQueries({ queryKey: getListTaxesQueryKey() });
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'paid':
        return <Badge className="bg-emerald-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Pago</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Atrasado</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DAS (Impostos)</h1>
          <p className="text-muted-foreground mt-1">Gerencie e acompanhe o pagamento do seu DAS mensal.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isSimulateOpen} onOpenChange={setIsSimulateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calculator className="w-4 h-4 mr-2" />
                Simular Multa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Simulador de Juros e Multa</DialogTitle>
                <DialogDescription>
                  Calcule o valor estimado de um DAS em atraso.
                </DialogDescription>
              </DialogHeader>
              <Form {...simulateForm}>
                <form onSubmit={simulateForm.handleSubmit(onSimulateSubmit)} className="space-y-4">
                  <FormField
                    control={simulateForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Original (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={simulateForm.control}
                    name="daysLate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dias de Atraso</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={simulateMutation.isPending}>
                    Calcular
                  </Button>
                </form>
              </Form>
              
              {simulationResult && (
                <div className="mt-6 p-4 bg-muted rounded-lg space-y-2">
                  <h4 className="font-semibold mb-2">Resultado da Simulação</h4>
                  <div className="flex justify-between text-sm">
                    <span>Valor Original:</span>
                    <span>{formatCurrency(simulationResult.originalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Multa Estimada:</span>
                    <span className="text-destructive">{formatCurrency(simulationResult.fine)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Juros Estimados:</span>
                    <span className="text-destructive">{formatCurrency(simulationResult.interest)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                    <span>Total Estimado:</span>
                    <span>{formatCurrency(simulationResult.total)}</span>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="w-4 h-4 mr-2" />
                Registrar Guia
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Nova Guia DAS</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="competence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Competência</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 01/2024" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vencimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                    Salvar Guia
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <Skeleton className="h-64" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competência</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxes?.map((tax) => (
                  <TableRow key={tax.id}>
                    <TableCell className="font-medium">{tax.competence}</TableCell>
                    <TableCell>{formatDate(tax.dueDate)}</TableCell>
                    <TableCell>{getStatusBadge(tax.status)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(tax.amount)}</TableCell>
                    <TableCell className="text-right">
                      {tax.status !== 'paid' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleMarkPaid(tax.id)}
                          disabled={markPaidMutation.isPending}
                        >
                          Marcar como Pago
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!taxes?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma guia registrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}