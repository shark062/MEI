import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Receipt,
  FileText,
  FolderOpen,
  CheckSquare,
  Bell,
  MessageSquare,
  User,
  LogOut,
  Menu,
  Calendar,
  FileSignature,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/revenue", label: "Faturamento", icon: Receipt },
  { href: "/taxes", label: "DAS (Impostos)", icon: FileText },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/receipts", label: "Recibos", icon: FileSignature },
  { href: "/documents", label: "Documentos", icon: FolderOpen },
  { href: "/declaration", label: "Declaração Anual", icon: CheckSquare },
  { href: "/alerts", label: "Alertas", icon: Bell },
  { href: "/ai", label: "Assistente IA", icon: MessageSquare },
  { href: "/profile", label: "Meu Perfil", icon: User },
  { href: "/admin", label: "Admin", icon: ShieldAlert },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();

  const NavLinks = () => (
    <nav className="flex flex-col gap-1 p-4">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href;
        return (
          <Link key={item.href} href={item.href}>
            <span
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm ${
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-muted text-foreground/80"
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
        className="justify-start px-3 text-destructive mt-2 gap-3"
        onClick={logout}
      >
        <LogOut size={18} />
        Sair
      </Button>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card">
        <div className="p-6 pb-4">
          <h1 className="text-2xl font-bold text-primary">MEI Fácil</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gestão inteligente para MEIs</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-card">
          <h1 className="text-xl font-bold text-primary">MEI Fácil</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <div className="p-6 pb-4">
                <h1 className="text-2xl font-bold text-primary">MEI Fácil</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Gestão inteligente para MEIs</p>
              </div>
              <NavLinks />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
