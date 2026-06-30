import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetProfile, getGetProfileQueryKey, useUpdateProfile } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const step1Schema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  cpf: z.string().min(11, "CPF inválido"),
  cnpj: z.string().min(14, "CNPJ inválido"),
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
    query: {
      queryKey: getGetProfileQueryKey(),
    }
  });

  const updateProfileMutation = useUpdateProfile();

  const form1 = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
    values: {
      name: profile?.name || user?.name || "",
      cpf: profile?.cpf || user?.cpf || "",
      cnpj: profile?.cnpj || user?.cnpj || "",
      phone: profile?.phone || user?.phone || "",
    },
  });

  const form2 = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
    values: {
      openingDate: profile?.openingDate || "",
      activity: profile?.activity || "",
      category: profile?.category || "",
      annualLimit: profile?.annualLimit || 81000,
    },
  });

  const onStep1Submit = (data: Step1Form) => {
    updateProfileMutation.mutate({ data }, {
      onSuccess: () => {
        setStep(2);
      },
      onError: () => {
        toast({ title: "Erro", description: "Não foi possível salvar os dados.", variant: "destructive" });
      }
    });
  };

  const onStep2Submit = (data: Step2Form) => {
    updateProfileMutation.mutate({ data: { ...data, onboardingCompleted: true } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
        toast({ title: "Sucesso", description: "Configuração concluída!" });
        setLocation("/dashboard");
      },
      onError: () => {
        toast({ title: "Erro", description: "Não foi possível finalizar a configuração.", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
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
                        <Input placeholder="Seu nome" {...field} />
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
                        <Input placeholder="000.000.000-00" {...field} />
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
                        <Input placeholder="00.000.000/0000-00" {...field} />
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
                        <Input placeholder="(00) 00000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full mt-6" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
                  Próximo
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
                        <Input type="date" {...field} />
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
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-4 mt-6">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-full">
                    Voltar
                  </Button>
                  <Button type="submit" className="w-full" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
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