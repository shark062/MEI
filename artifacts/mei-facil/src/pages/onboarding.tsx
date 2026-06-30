import { useState, useEffect, useRef } from "react";
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
import { maskCpf, maskCnpj, maskPhone, maskDate, onlyDigits, dateMaskToIso, isoToDateMask } from "@/lib/masks";

const step1Schema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  cpf: z.string().refine((v) => onlyDigits(v).length === 11, "CPF deve ter 11 dígitos"),
  cnpj: z.string().refine((v) => onlyDigits(v).length === 14, "CNPJ deve ter 14 dígitos"),
  phone: z.string().optional(),
});

const step2Schema = z.object({
  openingDate: z.string().optional(),
  activity: z.string().optional(),
  category: z.string().optional(),
  annualLimit: z.coerce.number().min(0).default(81000),
});

type Step1Form = z.infer<typeof step1Schema>;
type Step2Form = z.infer<typeof step2Schema>;

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: profile, isLoading } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });

  const updateProfileMutation = useUpdateProfile();
  const initialized = useRef(false);

  const form1 = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: "",
      cpf: "",
      cnpj: "",
      phone: "",
    },
  });

  const form2 = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      openingDate: "",
      activity: "",
      category: "",
      annualLimit: 81000,
    },
  });

  // Initialize only once — prevents React Query refetches from wiping typed values
  useEffect(() => {
    if (!profile || initialized.current) return;
    initialized.current = true;
    form1.reset({
      name: profile.name || user?.name || "",
      cpf: maskCpf(profile.cpf || user?.cpf || ""),
      cnpj: maskCnpj(profile.cnpj || user?.cnpj || ""),
      phone: maskPhone(profile.phone || user?.phone || ""),
    });
    form2.reset({
      openingDate: isoToDateMask(profile.openingDate || ""),
      activity: profile.activity || "",
      category: profile.category || "",
      annualLimit: profile.annualLimit || 81000,
    });
  }, [profile]);

  const onStep1Submit = (data: Step1Form) => {
    updateProfileMutation.mutate(
      {
        data: {
          ...data,
          cpf: onlyDigits(data.cpf),
          cnpj: onlyDigits(data.cnpj),
          phone: data.phone ? onlyDigits(data.phone) : undefined,
        },
      },
      {
        onSuccess: () => setStep(2),
        onError: () =>
          toast({ title: "Erro", description: "Não foi possível salvar os dados.", variant: "destructive" }),
      }
    );
  };

  const onStep2Submit = (data: Step2Form) => {
    const openingDateIso = data.openingDate ? dateMaskToIso(data.openingDate) : undefined;
    updateProfileMutation.mutate(
      { data: { ...data, openingDate: openingDateIso || undefined, onboardingCompleted: true } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
          toast({ title: "Configuração concluída!", description: "Bem-vindo ao MEI Fácil." });
          setLocation("/dashboard");
        },
        onError: () =>
          toast({ title: "Erro", description: "Não foi possível finalizar a configuração.", variant: "destructive" }),
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
                className={`h-1.5 flex-1 rounded-full transition-colors ${n <= step ? "bg-primary" : "bg-muted-foreground/20"}`}
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
              <form onSubmit={form1.handleSubmit(onStep1Submit)} className="space-y-4">
                <FormField
                  control={form1.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu nome completo" {...field} />
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
                          value={field.value}
                          onChange={(e) => field.onChange(maskCpf(e.target.value))}
                          onBlur={field.onBlur}
                          maxLength={14}
                          inputMode="numeric"
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
                          value={field.value}
                          onChange={(e) => field.onChange(maskCnpj(e.target.value))}
                          onBlur={field.onBlur}
                          maxLength={18}
                          inputMode="numeric"
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
                          value={field.value}
                          onChange={(e) => field.onChange(maskPhone(e.target.value))}
                          onBlur={field.onBlur}
                          maxLength={15}
                          inputMode="numeric"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full mt-6" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                  Próximo →
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...form2}>
              <form onSubmit={form2.handleSubmit(onStep2Submit)} className="space-y-4">
                <FormField
                  control={form2.control}
                  name="openingDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Abertura (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="DD/MM/AAAA"
                          value={field.value}
                          onChange={(e) => field.onChange(maskDate(e.target.value))}
                          onBlur={field.onBlur}
                          maxLength={10}
                          inputMode="numeric"
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
                        <Input placeholder="Ex: Comércio de roupas" {...field} />
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
                        <Input placeholder="Ex: Comércio, Serviço, Indústria" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form2.control}
                  name="annualLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limite Anual (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1000"
                          min={0}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 mt-6">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-full">
                    ← Voltar
                  </Button>
                  <Button type="submit" className="w-full" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
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
