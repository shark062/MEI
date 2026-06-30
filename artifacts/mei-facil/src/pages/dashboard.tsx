import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { AlertCircle, ArrowRight, CheckCircle2, AlertTriangle, FileText, PlusCircle, Calendar } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: {
      queryKey: getGetDashboardSummaryQueryKey()
    }
  });

  const getStatusBadge = (status?: string) => {
    switch(status) {
      case 'regular':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Regular</Badge>;
      case 'attention':
        return <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-600"><AlertTriangle className="w-3 h-3 mr-1" /> Atenção</Badge>;
      case 'risk':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Risco</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Olá, {user?.name?.split(' ')[0]}</h1>
          <p className="text-muted-foreground mt-1">Aqui está o resumo do seu negócio hoje.</p>
        </div>
        <div className="flex items-center gap-3">
          {summary?.status && getStatusBadge(summary.status)}
          {summary && summary.unreadAlerts > 0 && (
            <Link href="/alerts">
              <Button variant="outline" size="sm" className="relative">
                <AlertCircle className="w-4 h-4 mr-2" />
                Alertas
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                </span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Next Tax Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Próximo DAS</CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.nextDueTax ? (
              <>
                <div className="text-2xl font-bold">{formatCurrency(summary.nextDueTax.amount)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Vence em {formatDate(summary.nextDueTax.dueDate)}
                </p>
                {summary.nextDueTax.daysUntilDue !== null && summary.nextDueTax.daysUntilDue !== undefined && (
                  <Badge variant={summary.nextDueTax.daysUntilDue < 0 ? "destructive" : "secondary"} className="mt-3">
                    {summary.nextDueTax.daysUntilDue < 0 
                      ? `Atrasado há ${Math.abs(summary.nextDueTax.daysUntilDue)} dias`
                      : `Vence em ${summary.nextDueTax.daysUntilDue} dias`
                    }
                  </Badge>
                )}
              </>
            ) : (
              <div className="text-muted-foreground flex items-center mt-2">
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                Tudo em dia
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Progress Card */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Anual Utilizado</CardTitle>
              <Link href="/revenue">
                <span className="text-xs text-primary hover:underline flex items-center cursor-pointer">
                  Detalhes <ArrowRight className="w-3 h-3 ml-1" />
                </span>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.annualRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              de {formatCurrency(summary?.annualLimit || 81000)} disponíveis ({Math.round(summary?.usedPercent || 0)}%)
            </p>
            <Progress value={summary?.usedPercent || 0} className="h-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/revenue">
          <Button variant="outline" className="h-auto py-6 flex flex-col items-center justify-center gap-3 w-full hover:border-primary hover:text-primary transition-colors">
            <PlusCircle className="w-6 h-6" />
            <span>Registrar Faturamento</span>
          </Button>
        </Link>
        <Link href="/documents">
          <Button variant="outline" className="h-auto py-6 flex flex-col items-center justify-center gap-3 w-full hover:border-primary hover:text-primary transition-colors">
            <FileText className="w-6 h-6" />
            <span>Ver Documentos</span>
          </Button>
        </Link>
        <Link href="/taxes">
          <Button variant="outline" className="h-auto py-6 flex flex-col items-center justify-center gap-3 w-full hover:border-primary hover:text-primary transition-colors">
            <Calendar className="w-6 h-6" />
            <span>Gerenciar DAS</span>
          </Button>
        </Link>
        <Link href="/declaration">
          <Button variant="outline" className="h-auto py-6 flex flex-col items-center justify-center gap-3 w-full hover:border-primary hover:text-primary transition-colors">
            <CheckCircle2 className="w-6 h-6" />
            <span>Declaração Anual</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}