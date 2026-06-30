import { useGetAdminStats } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatters";
import { Users, TrendingUp, Bell, Activity, ShieldAlert } from "lucide-react";
import { Redirect } from "wouter";

export default function Admin() {
  const { user } = useAuth();
  const { data: stats, isLoading, error } = useGetAdminStats();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <ShieldAlert className="w-12 h-12 text-destructive opacity-70" />
        <h2 className="text-xl font-bold">Acesso restrito</h2>
        <p className="text-muted-foreground">Apenas administradores podem acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-7 h-7 text-primary" />
          Painel Administrativo
        </h1>
        <p className="text-muted-foreground mt-1">Visão geral da plataforma MEI Fácil.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total de usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats?.totalUsers ?? 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Novos usuários (30d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-600">{stats?.newUsers ?? 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Faturamento total (ano)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue ?? 0)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Alertas não lidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-500">{stats?.unreadAlerts ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Usuários recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(stats?.recentUsers?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado.</p>
                ) : (
                  <div className="space-y-3">
                    {stats?.recentUsers.map((u: any) => (
                      <div key={u.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {u.onboardingCompleted
                            ? <Badge className="bg-emerald-100 text-emerald-700 text-xs">Ativo</Badge>
                            : <Badge variant="outline" className="text-xs">Incompleto</Badge>
                          }
                          <span className="text-xs text-muted-foreground">
                            {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Log de atividades recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(stats?.recentActivity?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
                ) : (
                  <div className="space-y-2">
                    {stats?.recentActivity.slice(0, 10).map((log: any) => (
                      <div key={log.id} className="flex items-start gap-2 text-sm">
                        <Activity className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">{log.action}</span>
                          {log.entity && <span className="text-muted-foreground"> — {log.entity}</span>}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(log.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Plans info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estrutura de Planos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: "FREE", desc: "Funcionalidades básicas", color: "bg-slate-100 text-slate-700" },
                  { name: "PRO", desc: "Recursos avançados + IA", color: "bg-blue-100 text-blue-700" },
                  { name: "CONTADOR", desc: "Múltiplos MEIs + relatórios", color: "bg-purple-100 text-purple-700" },
                ].map(plan => (
                  <div key={plan.name} className="rounded-lg border p-4">
                    <Badge className={plan.color + " mb-2"}>{plan.name}</Badge>
                    <p className="text-sm text-muted-foreground">{plan.desc}</p>
                    <p className="text-xs text-muted-foreground mt-2 italic">Em breve • Estrutura preparada</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
