import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Shield, BellRing, FileText } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto border-b">
        <div className="text-2xl font-bold text-primary flex items-center gap-2">
          <Shield className="h-6 w-6" />
          MEI Fácil
        </div>
        <div className="space-x-4">
          <Link href="/login">
            <Button variant="ghost">Entrar</Button>
          </Link>
          <Link href="/register">
            <Button>Criar Conta</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl font-extrabold text-foreground tracking-tight mb-6">
          Nunca esqueça impostos.<br />Controle seu MEI de forma simples.
        </h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
          Um assistente financeiro completo criado para o microempreendedor brasileiro. 
          Sem contabilidade complicada, apenas o que você precisa saber.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="text-lg px-8">Começar Agora</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="text-lg px-8">Já sou cliente</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-muted px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16 text-foreground">Tudo que o seu MEI precisa</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={<Shield className="h-10 w-10 text-primary mb-4" />}
              title="Controle de Faturamento"
              description="Monitore sua receita, veja o quanto falta para o limite anual e evite surpresas com desenquadramento."
            />
            <FeatureCard 
              icon={<BellRing className="h-10 w-10 text-primary mb-4" />}
              title="Alertas Inteligentes"
              description="Avisos sobre vencimento do DAS, proximidade do limite de faturamento e obrigações pendentes."
            />
            <FeatureCard 
              icon={<FileText className="h-10 w-10 text-primary mb-4" />}
              title="Documentos Organizados"
              description="Guarde suas notas fiscais, comprovantes do DAS e certidões em um único lugar seguro."
            />
            <FeatureCard 
              icon={<CheckCircle2 className="h-10 w-10 text-primary mb-4" />}
              title="Declaração Facilitada"
              description="Faça a DASN-SIMEI anual com facilidade, utilizando todos os dados já registrados no sistema."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12 text-center">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
            <Shield className="h-6 w-6" />
            MEI Fácil
          </div>
          <p className="text-muted/60 mb-8">
            Feito para o microempreendedor individual brasileiro.
          </p>
          <div className="text-sm text-muted/40">
            © {new Date().getFullYear()} MEI Fácil. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-card p-8 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
      {icon}
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}