import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetCalendarEvents,
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
  type CalendarEvent,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, Trash2, CheckCircle2, Circle, ChevronLeft, ChevronRight, AlertCircle, FileText, Star } from "lucide-react";

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const eventFormSchema = z.object({
  title: z.string().min(2, "Título obrigatório"),
  description: z.string().optional(),
  date: z.string().min(1, "Data obrigatória"),
  type: z.string().default("custom"),
});
type EventFormValues = z.infer<typeof eventFormSchema>;

function getEventIcon(type: string) {
  switch (type) {
    case "das": return <FileText className="w-4 h-4 text-blue-500" />;
    case "declaration": return <Star className="w-4 h-4 text-purple-500" />;
    case "alert": return <AlertCircle className="w-4 h-4 text-amber-500" />;
    default: return <Calendar className="w-4 h-4 text-primary" />;
  }
}

function getEventBadge(type: string) {
  switch (type) {
    case "das": return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">DAS</Badge>;
    case "declaration": return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">Declaração</Badge>;
    case "alert": return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Alerta</Badge>;
    default: return <Badge variant="outline">Evento</Badge>;
  }
}

export default function Agenda() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: events, isLoading } = useGetCalendarEvents({ month: currentMonth, year: currentYear });
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: { title: "", description: "", date: "", type: "custom" },
  });

  const prevMonth = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const onSubmit = (data: EventFormValues) => {
    createEvent.mutate(data, {
      onSuccess: () => {
        toast({ title: "Evento criado com sucesso" });
        form.reset();
        setDialogOpen(false);
      },
      onError: () => toast({ title: "Erro ao criar evento", variant: "destructive" }),
    });
  };

  const toggleDone = (event: CalendarEvent) => {
    if (typeof event.id === "string") return;
    updateEvent.mutate(
      { id: event.id as number, data: { isDone: !event.isDone } },
      { onError: () => toast({ title: "Erro ao atualizar evento", variant: "destructive" }) }
    );
  };

  const handleDelete = (id: number | string) => {
    if (typeof id === "string") return;
    deleteEvent.mutate(id, {
      onSuccess: () => toast({ title: "Evento excluído" }),
      onError: () => toast({ title: "Erro ao excluir evento", variant: "destructive" }),
    });
  };

  const pending = events?.filter((e: CalendarEvent) => !e.isDone) ?? [];
  const done = events?.filter((e: CalendarEvent) => e.isDone) ?? [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="w-7 h-7 text-primary" />
            Agenda Financeira
          </h1>
          <p className="text-muted-foreground mt-1">Seus compromissos, DAS e pendências num só lugar.</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar evento</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl><Input placeholder="Ex: Pagamento fornecedor" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl><Input placeholder="Detalhes do evento" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="custom">Evento personalizado</SelectItem>
                        <SelectItem value="das">DAS</SelectItem>
                        <SelectItem value="declaration">Declaração</SelectItem>
                        <SelectItem value="alert">Alerta</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createEvent.isPending}>
                  Criar evento
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={prevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {MONTH_NAMES[currentMonth - 1]} {currentYear}
        </h2>
        <Button variant="outline" size="icon" onClick={nextMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : (
        <>
          {(events?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Nenhum evento em {MONTH_NAMES[currentMonth - 1]}.</p>
                <p className="text-sm mt-1">Clique em "Novo Evento" para adicionar.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pending.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Pendentes</h3>
                  {pending.map((event: CalendarEvent) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onToggle={toggleDone}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
              {done.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Concluídos</h3>
                  {done.map((event: CalendarEvent) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onToggle={toggleDone}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventCard({
  event,
  onToggle,
  onDelete,
}: {
  event: CalendarEvent;
  onToggle: (e: CalendarEvent) => void;
  onDelete: (id: number | string) => void;
}) {
  const dateFormatted = event.date
    ? new Date(event.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
    : "";

  return (
    <Card className={event.isDone ? "opacity-60" : ""}>
      <CardContent className="flex items-center gap-3 py-3 px-4">
        <button
          onClick={() => onToggle(event)}
          className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
          disabled={typeof event.id === "string"}
        >
          {event.isDone
            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            : <Circle className="w-5 h-5" />
          }
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {getEventIcon(event.type)}
            <span className={`font-medium text-sm ${event.isDone ? "line-through text-muted-foreground" : ""}`}>
              {event.title}
            </span>
            {getEventBadge(event.type)}
            {event.isAutoGenerated && (
              <Badge variant="secondary" className="text-xs">Auto</Badge>
            )}
          </div>
          {event.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">{dateFormatted}</p>
        </div>

        {typeof event.id !== "string" && (
          <button
            onClick={() => onDelete(event.id)}
            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </CardContent>
    </Card>
  );
}
