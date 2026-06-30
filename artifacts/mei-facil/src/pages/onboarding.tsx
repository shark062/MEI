import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetProfile, getGetProfileQueryKey, useUpdateProfile } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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

const step1Schema = z.object({
  name: z.string().min(2, "Nome é obrigatório (mínimo 2 caracteres)"),
  cpf: z.string().refine((v) => onlyDigits(v).length === 11, "CPF deve ter 11 dígitos"),
  cnpj: z.string().refine((v) => onlyDigits(v).length === 14, "CNPJ deve ter 14 dígitos"),
  phone: z.string().optional(),
});

const step2Schema = z.object({
  openingDate: z
    .string()
    .optional()
    .refine((v) => {
      if (!v) return true;
      const digits = v.replace(/\D/g, "");
      return digits.length === 0 || digits.length === 8;
    }, "Data inválida — use DD/MM/AAAA"),
  activity: z.string().optional(),
  category: z.string().optional(),
  annualLimitMasked: z.string().optional(),
});

type Step1Form = z.infer<typeof step1Schema>;
type Step2Form = z.infer<typeof step2Schema>;

function saveDraft(step: number, data: Partial<Step1Form & Step2Form>) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, data, ts: Date.now() }));
  } catch {
  }
}

function loadDraft(): { step: number; data: Partial<Step1Form & Step2Form> } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const age = Date.now() - (parsed.ts || 0);
    if (age > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
  }
}

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: profile, isLoading } = useGetProfile({
    query: {
      queryKey: getGetProfileQueryKey(),
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: Infinity,
    },
  });

  const updateProfileMutation = useUpdateProfile();
  const initialized = useRef(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form1 = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
    defaultValues: { name: "", cpf: "", cnpj: "", phone: "" },
    mode: "onBlur",
  });

  const form2 = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
    defaultValues: { openingDate: "", activity: "", category: "", annualLimitMasked: "81.000" },
    mode: "onBlur",
  });

  useEffect(() => {
    if (initialized.current) return;
    if (isLoading) return;

    initialized.current = true;

    const draft = loadDraft();

    const name = draft?.data?.name ?? profile?.name ?? user?.name ?? "";
    const cpf = draft?.data?.cpf ?? maskCpf(profile?.cpf ?? user?.cpf ?? "");
    const cnpj = draft?.data?.cnpj ?? maskCnpj(profile?.cnpj ?? user?.cnpj ?? "");
    const phone = draft?.data?.phone ?? maskPhone(profile?.phone ?? user?.phone ?? "");
    const openingDate = draft?.data?.openingDate ?? isoToDateMask(profile?.openingDate ?? "");
    const activity = draft?.data?.activity ?? profile?.activity ?? "";
    const category = draft?.data?.category ?? profile?.category ?? "";
    const annualLimit = profile?.annualLimit ?? 81000;
    const annualLimitMasked =
      draft?.data?.annualLimitMasked ?? (maskCurrency(String(annualLimit)) || "81.000");

    form1.reset({ name, cpf, cnpj, phone }, { keepDefaultValues: false });
    form2.reset(
      { openingDate, activity, category, annualLimitMasked },
      { keepDefaultValues: false }
    );

    if (draft?.step && draft.step > 1) {
      setStep(draft.step);
    }
  }, [isLoading, profile]);

  const scheduleAutoSave = useCallback(
    (currentStep: number, s1: Partial<Step1Form>, s2: Partial<Step2Form>) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        saveDraft(currentStep, { ...s1, ...s2 });
      }, 800);
    },
    []
  );

  const watchedS1 = form1.watch();
  const watchedS2 = form2.watch();

  useEffect(() => {
    if (!initialized.current) return;
    scheduleAutoSave(step, watchedS1, watchedS2);
  }, [watchedS1, watchedS2, step]);

  const onStep1Submit = (data: Step1Form) => {
    updateProfileMutation.mutate(
      {
        data: {
          name: data.name,
          cpf: onlyDigits(data.cpf),
          cnpj: onlyDigits(data.cnpj),
          phone: data.phone ? onlyDigits(data.phone) : undefined,
        },
      },
      {
        onSuccess: () => {
          saveDraft(2, { ...data, ...form2.getValues() });
          setStep(2);
        },
        onError: () =>
          toast({
            title: "Erro ao salvar",
            description: "Não foi possível salvar os dados. Tente novamente.",
            variant: "destructive",
          }),
      }
    );
  };

  const onStep2Submit = (data: Step2Form) => {
    const openingDateIso = data.openingDate ? dateMaskToIso(data.openingDate) : undefined;
    const annualLimit = data.annualLimitMasked
      ? currencyToNumber(data.annualLimitMasked)
      : 81000;

    updateProfileMutation.mutate(
      {
        data: {
          openingDate: openingDateIso || undefined,
          activity: data.activity || undefined,
          category: data.category || undefined,
          annualLimit,
          onboardingCompleted: true,
        },
      },
      {
        onSuccess: () => {
          clearDraft();
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
          toast({ title: "Configuração concluída!", description: "Bem-vindo ao MEI Fácil." });
          setLocation("/dashboard");
        },
        onError: () =>
          toast({
            title: "Erro ao finalizar",
            description: "Não foi possível finalizar a configuração. Tente novamente.",
            variant: "destructive",
          }),
      }
    );
  };

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
              <div
                key={n}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  n <= step ? "bg-primary" : "bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>
          <CardTitle className="text-2xl font-bold">Configure seu MEI Fácil</CardTitle>
          <CardDescription>
            {step === 1 ? "Etapa 1 de 2: Seus dados pessoais" : "Etapa 2 de 2: Dados do seu negócio"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 1 ? (
            <Form {...form1}>
              <form
                onSubmit={form1.handleSubmit(onStep1Submit)}
                className="space-y-4"
                noValidate
                autoComplete="off"
              >
                <FormField
                  control={form1.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Seu nome completo"
                          autoComplete="name"
                          autoCorrect="off"
                          autoCapitalize="words"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form1.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="000.000.000-00"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={14}
                          value={field.value}
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          onChange={(e) => field.onChange(maskCpf(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form1.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="00.000.000/0000-00"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={18}
                          value={field.value}
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          onChange={(e) => field.onChange(maskCnpj(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form1.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 00000-0000"
                          inputMode="tel"
                          autoComplete="tel"
                          maxLength={15}
                          value={field.value}
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          onChange={(e) => field.onChange(maskPhone(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full mt-6"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending && (
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  )}
                  Próximo →
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...form2}>
              <form
                onSubmit={form2.handleSubmit(onStep2Submit)}
                className="space-y-4"
                noValidate
                autoComplete="off"
              >
                <FormField
                  control={form2.control}
                  name="openingDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Abertura (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="DD/MM/AAAA"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={10}
                          value={field.value ?? ""}
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          onChange={(e) => field.onChange(maskDate(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form2.control}
                  name="activity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Atividade Principal (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Comércio de roupas"
                          autoComplete="off"
                          autoCorrect="off"
                          value={field.value ?? ""}
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form2.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Comércio, Serviço, Indústria"
                          autoComplete="off"
                          autoCorrect="off"
                          value={field.value ?? ""}
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form2.control}
                  name="annualLimitMasked"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limite Anual (R$)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none select-none">
                            R$
                          </span>
                          <Input
                            placeholder="81.000"
                            inputMode="numeric"
                            autoComplete="off"
                            className="pl-9"
                            value={field.value ?? ""}
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            onChange={(e) =>
                              field.onChange(maskCurrency(e.target.value))
                            }
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="w-full"
                  >
                    ← Voltar
                  </Button>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending && (
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    )}
                    Finalizar
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
