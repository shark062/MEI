import { useState, useEffect, useRef } from "react";
import { useGetProfile, getGetProfileQueryKey, useUpdateProfile } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { maskCpf, maskCnpj, maskPhone, maskDate, onlyDigits, dateMaskToIso, isoToDateMask } from "@/lib/masks";
import { UserCircle, Building2, Save, Loader2, LogOut, Pencil, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const profileSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  cpf: z.string().refine((v) => onlyDigits(v).length === 11, "CPF deve ter 11 dígitos"),
  cnpj: z.string().refine((v) => onlyDigits(v).length === 14, "CNPJ deve ter 14 dígitos"),
  phone: z.string().optional(),
  openingDate: z.string().optional(),
  activity: z.string().optional(),
  category: z.string().optional(),
  annualLimit: z.coerce.number().min(0, "Limite deve ser positivo"),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const initialized = useRef(false);

  const { data: profile, isLoading } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });

  const updateMutation = useUpdateProfile();

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      cpf: "",
      cnpj: "",
      phone: "",
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
    form.reset({
      name: profile.name || "",
      cpf: maskCpf(profile.cpf || ""),
      cnpj: maskCnpj(profile.cnpj || ""),
      phone: maskPhone(profile.phone || ""),
      openingDate: isoToDateMask(profile.openingDate || ""),
      activity: profile.activity || "",
      category: profile.category || "",
      annualLimit: profile.annualLimit || 81000,
    });
  }, [profile]);

  const handleCancel = () => {
    if (!profile) return;
    form.reset({
      name: profile.name || "",
      cpf: maskCpf(profile.cpf || ""),
      cnpj: maskCnpj(profile.cnpj || ""),
      phone: maskPhone(profile.phone || ""),
      openingDate: isoToDateMask(profile.openingDate || ""),
      activity: profile.activity || "",
      category: profile.category || "",
      annualLimit: profile.annualLimit || 81000,
    });
    setIsEditing(false);
  };

  const onSubmit = (data: ProfileForm) => {
    const openingDateIso = data.openingDate ? dateMaskToIso(data.openingDate) : undefined;
    updateMutation.mutate(
      {
        data: {
          ...data,
          cpf: onlyDigits(data.cpf),
          cnpj: onlyDigits(data.cnpj),
          phone: data.phone ? onlyDigits(data.phone) : undefined,
          openingDate: openingDateIso || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Perfil atualizado!", description: "Suas informações foram salvas." });
          setIsEditing(false);
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
        },
        onError: () => {
          toast({ title: "Erro", description: "Não foi possível salvar as alterações.", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais e dados do MEI.</p>
        </div>
        <Button
          variant="outline"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" /> Sair da conta
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            {!isEditing ? (
              <Button type="button" onClick={() => setIsEditing(true)}>
                <Pencil className="w-4 h-4 mr-2" /> Editar Dados
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-2" /> Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <Save className="w-4 h-4 mr-2" />}
                  Salvar Alterações
                </Button>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dados Pessoais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserCircle className="w-5 h-5 text-primary" />
                  Dados Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* E-mail — somente leitura */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">E-mail</label>
                  <Input value={profile?.email || ""} disabled className="bg-muted text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
                </div>

                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value}
                          onChange={(e) => field.onChange(maskCpf(e.target.value))}
                          onBlur={field.onBlur}
                          disabled={!isEditing}
                          maxLength={14}
                          inputMode="numeric"
                          placeholder="000.000.000-00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value}
                          onChange={(e) => field.onChange(maskPhone(e.target.value))}
                          onBlur={field.onBlur}
                          disabled={!isEditing}
                          maxLength={15}
                          inputMode="numeric"
                          placeholder="(00) 00000-0000"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Dados do Negócio */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="w-5 h-5 text-primary" />
                  Dados do Negócio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value}
                          onChange={(e) => field.onChange(maskCnpj(e.target.value))}
                          onBlur={field.onBlur}
                          disabled={!isEditing}
                          maxLength={18}
                          inputMode="numeric"
                          placeholder="00.000.000/0000-00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="activity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Atividade Principal</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} placeholder="Ex: Comércio de roupas" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} placeholder="Ex: Comércio, Serviço, Indústria" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="openingDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Abertura</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value}
                          onChange={(e) => field.onChange(maskDate(e.target.value))}
                          onBlur={field.onBlur}
                          disabled={!isEditing}
                          maxLength={10}
                          inputMode="numeric"
                          placeholder="DD/MM/AAAA"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
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
                          disabled={!isEditing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>
    </div>
  );
}
