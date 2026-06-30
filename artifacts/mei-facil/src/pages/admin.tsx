import { useState, useEffect } from "react";
import {
  Users,
  TrendingUp,
  Bell,
  Activity,
  RefreshCw,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AdminStats {
  totalUsers: number;
  newUsers: number;
  totalRevenue: number;
  unreadAlerts: number;
  recentActivity: {
    id: number;
    userId: number | null;
    action: string;
    entity: string | null;
    entityId: string | null;
    details: string | null;
    ipAddress: string | null;
    createdAt: string;
  }[];
  recentUsers: {
    id: number;
    name: string;
    email: string;
    createdAt: string;
    onboardingCompleted: boolean | null;
  }[];
}

function adminFetch<T>(path: string): Promise<T> {
  const token = localStorage.getItem("adminToken");
  return fetch(path, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(async (res) => {
    if (res.status === 401) {
      localStorage.removeItem("adminToken");
      window.location.href = "/admin-login";
      throw new Error("Unauthorized");
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch<AdminStats>("/api/admin/stats");
      setStats(data);
      setLastUpdated(new Date());
    } catch (e: any) {
      if (e.message !== "Unauthorized") setError("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck size={24} className="text-emerald-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Visão Geral</h1>
            {lastUpdated && (
              <p className="text-xs text-slate-500">
                Atualizado: {lastUpdated.toLocaleTimeString("pt-BR")}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw size={14} className={`mr-1 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-slate-700"
            onClick={() => { localStorage.removeItem("adminToken"); window.location.href = "/admin-login"; }}
          >
            <LogOut size={14} className="mr-1" />
            Sair
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Usuários</CardTitle>
                <Users size={16} className="text-emerald-400" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wide">Novos (30d)</CardTitle>
                <TrendingUp size={16} className="text-blue-400" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-3xl font-bold text-white">{stats.newUsers}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wide">Fat. Total (ano)</CardTitle>
                <TrendingUp size={16} className="text-yellow-400" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-xl font-bold text-white">{formatMoney(stats.totalRevenue)}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wide">Alertas Não Lidos</CardTitle>
                <Bell size={16} className="text-orange-400" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-3xl font-bold text-white">{stats.unreadAlerts}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="px-4 pt-4 pb-3">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Users size={16} className="text-emerald-400" />
                  Usuários Recentes
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {stats.recentUsers.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum usuário ainda</p>
                ) : stats.recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-white">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                    <div className="text-right">
                      <Badge
                        className={`text-xs ${u.onboardingCompleted ? "bg-emerald-700 text-emerald-100" : "bg-slate-700 text-slate-400"}`}
                      >
                        {u.onboardingCompleted ? "Ativo" : "Pendente"}
                      </Badge>
                      <p className="text-xs text-slate-600 mt-1">{timeAgo(u.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="px-4 pt-4 pb-3">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Activity size={16} className="text-blue-400" />
                  Atividade Recente
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {stats.recentActivity.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma atividade registrada</p>
                ) : stats.recentActivity.slice(0, 10).map((a) => (
                  <div key={a.id} className="flex items-start justify-between py-1.5 border-b border-slate-700/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 truncate">{a.action}</p>
                      {a.entity && (
                        <p className="text-xs text-slate-600">{a.entity}{a.entityId ? ` #${a.entityId}` : ""}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-600 ml-2 shrink-0">{timeAgo(a.createdAt)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
