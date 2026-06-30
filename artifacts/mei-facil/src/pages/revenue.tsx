import { useState } from "react";
import { 
  useListRevenue, 
  getListRevenueQueryKey, 
  useGetRevenueStats, 
  getGetRevenueStatsQueryKey,
  useGetMonthlyRevenue,
  getGetMonthlyRevenueQueryKey,
  useCreateRevenue,
  useUpdateRevenue,
  useDeleteRevenue
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { PlusCircle, Pencil, Trash2, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const revenueSchema = z.object({
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  date: z.string().min(1, "Data é obrigatória"),
  category: z.string().min(1, "Categoria é obrigatória"),
  description: z.string().optional(),
});

type RevenueForm = z.infer<typeof revenueSchema>;

export default function RevenuePage() {
  const currentYear = new Date().getFullYear();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: listResponse, isLoading: isLoadingList } = useListRevenue();
  const { data: stats, isLoading: isLoadingStats } = useGetRevenueStats({ year: currentYear }, {
    query: {
      queryKey: getGetRevenueStatsQueryKey({ year: currentYear })
    }
  });
  const { data: monthlyData, isLoading: isLoadingMonthly } = useGetMonthlyRevenue({ year: currentYear }, {
    query: {
      queryKey: getGetMonthlyRevenueQueryKey({ year: currentYear })
    }
  });

  const createMutation = useCreateRevenue();
  const updateMutation = useUpdateRevenue();
  const deleteMutation = useDeleteRevenue();

  const form = useForm<RevenueForm>({
    resolver: zodResolver(revenueSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      category: "",
      description: "",
    },
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: getListRevenueQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRevenueStatsQueryKey({ year: currentYear }) });
    queryClient.invalidateQueries({ queryKey: getGetMonthlyRevenueQueryKey({ year: currentYear }) });
  };

  const onSubmit = (data: RevenueForm) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data }, {
        onSuccess: () => {
          toast({ title: "Sucesso", description: "Receita atualizada." });
          setIsAddOpen(false);
          setEditingId(null);
          form.reset();
          invalidateQueries();
        }
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: () => {
          toast({ title: "Sucesso", description: "Receita registrada." });
          setIsAddOpen(false);
          form.reset();
          invalidateQueries();
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este registro?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Excluído", description: "Registro removido com sucesso." });
          invalidateQueries();
        }
      });
    }
  };

  const openEdit = (revenue: any) => {
    setEditingId(revenue.id);
    form.reset({
      amount: revenue.amount,
      date: revenue.date.split('T')[0],
      category: revenue.category,
      description: revenue.description || "",
    });
    setIsAddOpen(true);
  };

  const openAdd = () => {
    setEditingId(null);
    form.reset({
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      category: "",
      description: "",
    });
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Faturamento</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas receitas e controle seu limite.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Novo Registro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Receita" : "Registrar Receita"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Serviços prestados" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Detalhes adicionais" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  Salvar
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {stats && stats.alertLevel && stats.alertLevel !== 'safe' && (
        <Alert variant={stats.alertLevel === 'danger' || stats.alertLevel === 'exceeded' ? "destructive" : "default"} className={stats.alertLevel === 'warning' ? "border-amber-500 text-amber-600 bg-amber-50" : ""}>
          {stats.alertLevel === 'danger' || stats.alertLevel === 'exceeded' ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4 text-amber-600" />}
          <AlertTitle>Atenção ao limite de faturamento!</AlertTitle>
          <AlertDescription>
            Você já utilizou {Math.round(stats.usedPercent)}% do seu limite anual. 
            {stats.alertLevel === 'exceeded' && " VOCÊ EXCEDEU O LIMITE DO MEI."}
          </AlertDescription>
        </Alert>
      )}

      {isLoadingStats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Anual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalAnnual)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalMonthly)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Média Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.avgMonthly)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Projeção Anual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.projectedAnnual)}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Faturamento Mensal</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {isLoadingMonthly ? (
              <Skeleton className="w-full h-full" />
            ) : monthlyData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(value) => `R$ ${value}`} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>Últimos Registros</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {isLoadingList ? (
              <div className="space-y-4">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : listResponse?.entries?.length ? (
              <div className="space-y-4">
                {listResponse.entries.slice(0, 5).map(item => (
                  <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg bg-card">
                    <div>
                      <div className="font-medium">{item.category}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(item.date)}</div>
                    </div>
                    <div className="font-bold">{formatCurrency(item.amount)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma receita registrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Registros</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingList ? (
            <Skeleton className="h-64" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listResponse?.entries?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{formatDate(item.date)}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-muted-foreground">{item.description}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!listResponse?.entries?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum registro encontrado
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