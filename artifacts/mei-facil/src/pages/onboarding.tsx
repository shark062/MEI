import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useGetProfile, getGetProfileQueryKey, useUpdateProfile } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  maskCpf,
  maskCnpj,
  maskPhone,
  maskDate,
  maskCurrency,
  currencyToNumber,
  onlyDigits,
  dateMaskToIso,
  isoToDateMask,
} from "@/lib/masks";

const DRAFT_KEY = "mei-facil:onboarding-draft";

interface Step1Data { name: string; cpf: string; cnpj: string; phone: string; }
interface Step2Data { openingDate: string; activity: string; category: string; annualLimitMasked: string; }

function saveDraft(step: number, data: Partial<Step1Data & Step2Data>) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, data, ts: Date.now() })); } catch {}
}
function loadDraft(): { step: number; data: Partial<Step1Data & Step2Data> } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - (parsed.ts || 0) > 24 * 60 * 60 * 1000) { localStorage.removeItem(DRAFT_KEY); return null; }
    return parsed;
  } catch { return null; }
}
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch {} }

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const initialized = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: profile, isLoading } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey(), staleTime: Infinity, refetchOnWindowFocus: false },
  });
  const updateProfileMutation = useUpdateProfile();

  const [s1, setS1] = useState<Step1Data>({ name: "", cpf: "", cnpj: "", phone: "" });
  const [s1Errors, setS1Errors] = useState<Partial<Step1Data>>({});
  const [s2, setS2] = useState<Step2Data>({ openingDate: "", activity: "", category: "", annualLimitMasked: "81.000" });
  const [s2Errors, setS2Errors] = useState<Partial<Step2Data>>({});

  useEffect(() => {
    if (initialized.current || isLoading) return;
    initialized.current = true;
    const draft = loadDraft();
    const annualLimit = profile?.annualLimit ?? 81000;
    const rawMasked = maskCurrency(String(annualLimit));
    setS1({
      name: draft?.data?.name ?? profile?.name ?? user?.name ?? "",
      cpf: draft?.data?.cpf ?? maskCpf(profile?.cpf ?? user?.cpf ?? ""),
      cnpj: draft?.data?.cnpj ?? maskCnpj(profile?.cnpj ?? user?.cnpj ?? ""),
      phone: draft?.data?.phone ?? maskPhone(profile?.phone ?? user?.phone ?? ""),
    });
    setS2({
      openingDate: draft?.data?.openingDate ?? isoToDateMask(profile?.openingDate ?? ""),
      activity: draft?.data?.activity ?? profile?.activity ?? "",
      category: draft?.data?.category ?? profile?.category ?? "",
      annualLimitMasked: draft?.data?.annualLimitMasked ?? (rawMasked || "81.000"),
    });
    if (draft?.step && draft.step > 1) setStep(draft.step);
  }, [isLoading, profile]);

  function validateStep1(): boolean {
    const errs: Partial<Step1Data> = {};
    if (!s1.name.trim() || s1.name.trim().length < 2) errs.name = "Nome obrigatório (mínimo 2 caracteres)";
    if (onlyDigits(s1.cpf).length !== 11) errs.cpf = "CPF deve ter 11 dígitos";
    if (onlyDigits(s1.cnpj).length !== 14) errs.cnpj = "CNPJ deve ter 14 dígitos";
    setS1Errors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep2(): boolean {
    const errs: Partial<Step2Data> = {};
    if (s2.openingDate) {
      const digits = onlyDigits(s2.openingDate);
      if (digits.length > 0 && digits.length !== 8) errs.openingDate = "Data inválida — use DD/MM/AAAA";
    }
    setS2Errors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep1()) return;
    setSubmitting(true);
    updateProfileMutation.mutate(
      { data: { name: s1.name, cpf: onlyDigits(s1.cpf), cnpj: onlyDigits(s1.cnpj), phone: s1.phone ? onlyDigits(s1.phone) : undefined } },
      {
        onSuccess: () => { saveDraft(2, { ...s1, ...s2 }); setStep(2); setSubmitting(false); },
        onError: () => { toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" }); setSubmitting(false); },
      }
    );
  }

  async function handleStep2Submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep2()) return;
    setSubmitting(true);
    const openingDateIso = s2.openingDate ? dateMaskToIso(s2.openingDate) : undefined;
    const annualLimit = s2.annualLimitMasked ? currencyToNumber(s2.annualLimitMasked) : 81000;
    updateProfileMutation.mutate(
      { data: { openingDate: openingDateIso || undefined, activity: s2.activity || undefined, category: s2.category || undefined, annualLimit, onboardingCompleted: true } },
      {
        onSuccess: () => {
          clearDraft();
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
          toast({ title: "Configuração concluída!", description: "Bem-vindo ao MEI Fácil." });
          setLocation("/dashboard");
        },
        onError: () => { toast({ title: "Erro ao finalizar", description: "Tente novamente.", variant: "destructive" }); setSubmitting(false); },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex gap-2 mb-2">
            {[1, 2].map((n) => (
              <div key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${n <= step ? "bg-primary" : "bg-muted-foreground/20"}`} />
            ))}
          </div>
          <CardTitle className="text-2xl font-bold">Configure seu MEI Fácil</CardTitle>
          <CardDescription>
            {step === 1 ? "Etapa 1 de 2: Seus dados pessoais" : "Etapa 2 de 2: Dados do seu negócio"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleStep1Submit} className="space-y-4" noValidate autoComplete="off">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="name">Nome Completo</label>
                <Input
                  id="name"
                  placeholder="Seu nome completo"
                  autoComplete="name"
                  autoCapitalize="words"
                  value={s1.name}
                  onChange={(e) => setS1((p) => ({ ...p, name: e.target.value }))}
                />
                {s1Errors.name && <p className="text-xs text-destructive">{s1Errors.name}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="cpf">CPF</label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={14}
                  value={s1.cpf}
                  onChange={(e) => setS1((p) => ({ ...p, cpf: maskCpf(e.target.value) }))}
                />
                {s1Errors.cpf && <p className="text-xs text-destructive">{s1Errors.cpf}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="cnpj">CNPJ</label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={18}
                  value={s1.cnpj}
                  onChange={(e) => setS1((p) => ({ ...p, cnpj: maskCnpj(e.target.value) }))}
                />
                {s1Errors.cnpj && <p className="text-xs text-destructive">{s1Errors.cnpj}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="phone">Telefone (opcional)</label>
                <Input
                  id="phone"
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={15}
                  value={s1.phone}
                  onChange={(e) => setS1((p) => ({ ...p, phone: maskPhone(e.target.value) }))}
                />
              </div>

              <Button type="submit" className="w-full mt-6" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                Próximo →
              </Button>
            </form>
          ) : (
            <form onSubmit={handleStep2Submit} className="space-y-4" noValidate autoComplete="off">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="openingDate">Data de Abertura (opcional)</label>
                <Input
                  id="openingDate"
                  placeholder="DD/MM/AAAA"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={10}
                  value={s2.openingDate}
                  onChange={(e) => setS2((p) => ({ ...p, openingDate: maskDate(e.target.value) }))}
                />
                {s2Errors.openingDate && <p className="text-xs text-destructive">{s2Errors.openingDate}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="activity">Atividade Principal (opcional)</label>
                <Input
                  id="activity"
                  placeholder="Ex: Comércio de roupas"
                  autoComplete="off"
                  autoCorrect="off"
                  value={s2.activity}
                  onChange={(e) => setS2((p) => ({ ...p, activity: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="category">Categoria (opcional)</label>
                <Input
                  id="category"
                  placeholder="Ex: Comércio, Serviço, Indústria"
                  autoComplete="off"
                  autoCorrect="off"
                  value={s2.category}
                  onChange={(e) => setS2((p) => ({ ...p, category: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="annualLimit">Limite Anual (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none select-none">
                    R$
                  </span>
                  <Input
                    id="annualLimit"
                    placeholder="81.000"
                    inputMode="numeric"
                    autoComplete="off"
                    className="pl-9"
                    value={s2.annualLimitMasked}
                    onChange={(e) => setS2((p) => ({ ...p, annualLimitMasked: maskCurrency(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-full">
                  ← Voltar
                </Button>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                  Finalizar
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
