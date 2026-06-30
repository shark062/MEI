import { useState } from "react";
import { 
  useGetDeclaration, 
  getGetDeclarationQueryKey, 
  useGetDeclarationChecklist, 
  getGetDeclarationChecklistQueryKey,
  useUpdateChecklistItem 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { CheckSquare, ExternalLink, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function DeclarationPage() {
  const currentYear = new Date().getFullYear();
  const declarationYear = currentYear - 1; // Always declare previous year
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: declaration, isLoading: isLoadingDecl } = useGetDeclaration({ year: declarationYear }, {
    query: { queryKey: getGetDeclarationQueryKey({ year: declarationYear }) }
  });
  
  const { data: checklist, isLoading: isLoadingCheck } = useGetDeclarationChecklist({ year: declarationYear }, {
    query: { queryKey: getGetDeclarationChecklistQueryKey({ year: declarationYear }) }
  });

  const updateItemMutation = useUpdateChecklistItem();

  const handleCheck = (id: number, checked: boolean) => {
    updateItemMutation.mutate({ 
      id, 
      data: { completed: checked } 
    }, {
      onSuccess: () => {
        // Optimistically update or refetch
        queryClient.invalidateQueries({ queryKey: getGetDeclarationChecklistQueryKey({ year: declarationYear }) });
        queryClient.invalidateQueries({ queryKey: getGetDeclarationQueryKey({ year: declarationYear }) });
      }
    });
  };

  const getStatusBadge = (status?: string) => {
    switch(status) {
      case 'completed':
        return <Badge className="bg-emerald-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Concluída</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-amber-500 text-white"><AlertTriangle className="w-3 h-3 mr-1" /> Em Andamento</Badge>;
      case 'pending':
        return <Badge variant="outline">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isCompleted = declaration?.status === 'completed' || declaration?.completionPercent === 100;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Declaração Anual (DASN-SIMEI)</h1>
        <p className="text-muted-foreground mt-1">Prepare e organize os dados para a sua declaração referente a {declarationYear}.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-primary" />
                Checklist de Preparação
              </CardTitle>
              <CardDescription>
                Conclua todos os passos antes de enviar sua declaração oficial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingCheck ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : checklist?.length ? (
                <div className="space-y-4">
                  {checklist.map((item) => (
                    <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox 
                        id={`check-${item.id}`} 
                        checked={item.completed}
                        onCheckedChange={(checked) => handleCheck(item.id, checked as boolean)}
                        disabled={updateItemMutation.isPending || isCompleted}
                      />
                      <label 
                        htmlFor={`check-${item.id}`} 
                        className={`text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer ${item.completed ? 'line-through text-muted-foreground' : ''}`}
                      >
                        {item.label}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhuma etapa encontrada.
                </div>
              )}

              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span>Progresso</span>
                  <span className="font-medium">{declaration?.completionPercent || 0}%</span>
                </div>
                <Progress value={declaration?.completionPercent || 0} className="h-2" />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 border-t flex justify-between items-center p-6">
              <p className="text-sm text-muted-foreground max-w-[60%]">
                Ao completar 100%, você terá todas as informações necessárias para preencher no site da Receita.
              </p>
              <Button 
                disabled={declaration?.completionPercent !== 100}
                className={declaration?.completionPercent === 100 && !isCompleted ? "animate-pulse" : ""}
                onClick={() => window.open('https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/dasnsimei.app/Default.aspx', '_blank')}
              >
                Fazer Declaração Oficial <ExternalLink className="ml-2 w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumo {declarationYear}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingDecl ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <div>{getStatusBadge(declaration?.status)}</div>
                  </div>
                  
                  <div className="flex flex-col gap-1 pt-3 border-t">
                    <span className="text-sm text-muted-foreground">Faturamento Registrado</span>
                    <span className="text-2xl font-bold">{formatCurrency(declaration?.annualRevenue || 0)}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1 pt-3 border-t">
                    <span className="text-sm text-muted-foreground">Meses com Movimentação</span>
                    <span className="text-lg font-medium">{declaration?.monthsRegistered || 0} meses</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <h4 className="font-semibold text-primary mb-2 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Importante
              </h4>
              <p className="text-sm text-muted-foreground">
                O MEI Fácil apenas organiza os seus dados. O envio oficial da declaração (DASN-SIMEI) deve ser feito exclusivamente através do Portal do Empreendedor na Receita Federal.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}