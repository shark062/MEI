import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Credenciais inválidas");
        setLoading(false);
        return;
      }
      localStorage.setItem("adminToken", data.adminToken);
      setLocation("/admin");
    } catch {
      setError("Erro de conexão com o servidor");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800 text-slate-100 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-emerald-600 p-3 rounded-full">
              <ShieldCheck size={28} className="text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">Painel Admin</CardTitle>
          <CardDescription className="text-slate-400">
            Acesso restrito ao desenvolvedor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300" htmlFor="admin-email">
                E-mail
              </label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@meifacil.dev"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300" htmlFor="admin-password">
                Senha
              </label>
              <Input
                id="admin-password"
                type="password"
                placeholder="••••••••"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-900/30 border border-red-700 rounded px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
              Entrar no Painel Admin
            </Button>
          </form>

          <p className="text-xs text-slate-600 text-center mt-6">
            Esta área não é acessível por usuários regulares
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
