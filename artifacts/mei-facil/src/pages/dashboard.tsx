import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
  useGetProfile,
  getGetProfileQueryKey,
  useGetMeiScore,
  useGetDeclarationChecklist,
  getGetDeclarationChecklistQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
  PlusCircle,
  Calendar,
  UserCircle,
  Heart,
  Star,
  Zap,
  TrendingUp,
} from "lucide-react";
import { Link } from "wouter";

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color =
    score >= 90 ? "text-emerald-500" :
    score >= 70 ? "text-amber-500" :
    "text-red-500";

  const bgColor =
    score >= 90 ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" :
    score >= 70 ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" :
    "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800";

  return (
    <div className={`flex items-center gap-4 rounded-xl border p-4 ${bgColor}`}>
      <div className="relative w-16 h-16 shrink-0">
        <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/20" />
          <circle
            cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3"
            strokeDasharray={`${(score / 100) * 94.25} 94.25`}
            className={color}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-lg font-bold leading-none ${color}`}>{score}</span>
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Saúde do MEI</p>
        <p className={`text-xl font-bold ${color}`}>{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {score >= 90 ? "Seu MEI está saudável!" :
           score >= 70 ? "Atenção a alguns pontos." :
           "Ação necessária!"}
        </p>
      </div>
      <div className="ml-auto">
        {score >= 90 ? <Star className={`w-6 h-6 ${color}`} /> :
         score >= 70 ? <Zap className={`w-6 h-6 ${color}`} /> :
         <AlertCircle className={`w-6 h-6 ${color}`} />}
      </div>
    </div>
  );
}

function FirstStepsChecklist() {
  const steps = [
    { label: "Completar perfil", href: "/onboarding" },
    { label: "Registrar primeiro faturamento", href: "/revenue" },
    { label: "Organizar documentos", href: "/documents" },
    { label: "Verificar alertas", href: "/alerts" },
    { label: "Conferir DAS", href: "/taxes" },
  ];

  const { data: profile } = useGetProfile({ query: { queryKey: getGetProfileQueryKey(), staleTime: 60_000 } });
  const { data: summary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: checklist } = useGetDeclarationChecklist({
    params: { year: new Date().getFullYear() },
    query: { queryKey: getGetDeclarationChecklistQueryKey({ year: new Date().getFullYear() }), staleTime: 60_000 },
  });

  const completedSteps = [
    !!(profile?.name && profile?.cpf && profile?.cnpj),
    (summary?.annualRevenue ?? 0) > 0,
    false, // docs checked separately
    true,  // alerts always available
    true,  // DAS always available
  ];

  const completed = completedSteps.filter(Boolean).length;
  const percent = Math.round((completed / steps.length) * 100);

  if (percent === 100) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Primeiros passos
          </CardTitle>
          <Badge variant="secondary">{percent}% configurado</Badge>
        </div>
        <Progress value={percent} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <Link key={i} href={step.href}>
              <div className={`flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer transition-colors ${completedSteps[i] ? "text-muted-foreground" : "hover:bg-muted"}`}>
                {completedSteps[i]
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40 shrink-0" />
                }
                <span className={`text-sm ${completedSteps[i] ? "line-through" : "font-medium"}`}>
                  {step.label}
                </span>
                {!completedSteps[i] && <ArrowRight className="w-3 h-3 ml-auto text-muted-foreground" />}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const { data: profile } = useGetProfile({
    query: {
      queryKey: getGetProfileQueryKey(),
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
  });

  const { data: meiScore, isLoading: scoreLoading } = useGetMeiScore();

  const isProfileIncomplete =
    profile !== undefined &&
    (!profile?.name || !profile?.cpf || !profile?.cnpj);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "regular":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Regular</Badge>;
      case "attention":
        return <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-600"><AlertTriangle className="w-3 h-3 mr-1" /> Atenção</Badge>;
      case "risk":
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
      {/* Incomplete profile banner */}
      {isProfileIncomplete && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 px-4 py-3">
          <UserCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Complete seu cadastro para liberar todos os recursos
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Algumas funcionalidades ficam limitadas sem os dados completos do perfil.
            </p>
          </div>
          <Link href="/onboarding">
            <Button size="sm" variant="outline" className="shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-600 dark:hover:bg-amber-900/30">
              Completar →
            </Button>
          </Link>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Olá, {user?.name?.split(" ")[0]}</h1>
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

      {/* MEI Health Score */}
      {scoreLoading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : meiScore ? (
        <ScoreRing score={meiScore.score} label={meiScore.label} />
      ) : null}

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
                  <Badge
                    variant={summary.nextDueTax.daysUntilDue < 0 ? "destructive" : "secondary"}
                    className="mt-3"
                  >
                    {summary.nextDueTax.daysUntilDue < 0
                      ? `Atrasado há ${Math.abs(summary.nextDueTax.daysUntilDue)} dias`
                      : `Vence em ${summary.nextDueTax.daysUntilDue} dias`}
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
            {(summary?.projectedAnnual ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Projeção anual: {formatCurrency(summary?.projectedAnnual ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* First Steps Checklist */}
      <FirstStepsChecklist />

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
        <Link href="/agenda">
          <Button variant="outline" className="h-auto py-6 flex flex-col items-center justify-center gap-3 w-full hover:border-primary hover:text-primary transition-colors">
            <Calendar className="w-6 h-6" />
            <span>Agenda Financeira</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
