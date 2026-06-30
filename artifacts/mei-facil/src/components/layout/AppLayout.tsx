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
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/revenue", label: "Faturamento", icon: Receipt },
  { href: "/taxes", label: "DAS (Impostos)", icon: FileText },
  { href: "/documents", label: "Documentos", icon: FolderOpen },
  { href: "/declaration", label: "Declaração Anual", icon: CheckSquare },
  { href: "/alerts", label: "Alertas", icon: Bell },
  { href: "/ai", label: "Assistente IA", icon: MessageSquare },
  { href: "/profile", label: "Meu Perfil", icon: User },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();

  const NavLinks = () => (
    <nav className="flex flex-col gap-2 p-4">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href;
        return (
          <Link key={item.href} href={item.href}>
            <span className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              <Icon size={20} />
              {item.label}
            </span>
          </Link>
        );
      })}
      <Button variant="ghost" className="justify-start px-3 text-destructive mt-auto" onClick={logout}>
        <LogOut size={20} className="mr-3" />
        Sair
      </Button>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary">MEI Fácil</h1>
        </div>
        <NavLinks />
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-card">
          <h1 className="text-xl font-bold text-primary">MEI Fácil</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <div className="p-6">
                <h1 className="text-2xl font-bold text-primary">MEI Fácil</h1>
              </div>
              <NavLinks />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}