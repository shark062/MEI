import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Users,
  Activity,
  LogOut,
  ShieldCheck,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const ADMIN_NAV = [
  { href: "/admin", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/activity", label: "Atividade", icon: Activity },
];

function handleLogout() {
  localStorage.removeItem("adminToken");
  window.location.href = "/admin-login";
}

function NavLinks() {
  const [location] = useLocation();
  return (
    <nav className="flex flex-col gap-1 p-4">
      {ADMIN_NAV.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href;
        return (
          <Link key={item.href} href={item.href}>
            <span
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm ${
                isActive
                  ? "bg-emerald-600 text-white font-medium"
                  : "hover:bg-slate-700 text-slate-300"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </span>
          </Link>
        );
      })}
      <Button
        variant="ghost"
        className="justify-start px-3 text-red-400 hover:text-red-300 hover:bg-slate-700 mt-2 gap-3"
        onClick={handleLogout}
      >
        <LogOut size={18} />
        Sair do Admin
      </Button>
    </nav>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-900">
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-700 bg-slate-800">
        <div className="p-6 pb-4 flex items-center gap-2">
          <ShieldCheck size={22} className="text-emerald-400" />
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">MEI Fácil Admin</h1>
            <p className="text-xs text-slate-500">Painel do desenvolvedor</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-400" />
            <span className="text-white font-bold text-sm">MEI Fácil Admin</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-700">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-slate-800 border-slate-700">
              <div className="p-6 pb-4 flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-400" />
                <h1 className="text-lg font-bold text-white">MEI Fácil Admin</h1>
              </div>
              <NavLinks />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto bg-slate-900">
          {children}
        </main>
      </div>
    </div>
  );
}
