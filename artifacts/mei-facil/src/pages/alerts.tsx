import { useState } from "react";
import { 
  useListAlerts, 
  getListAlertsQueryKey, 
  useMarkAlertRead 
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/formatters";
import { Bell, Check, Calendar, FileText, AlertTriangle, Info } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function AlertsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useListAlerts({ unreadOnly }, {
    query: { queryKey: getListAlertsQueryKey({ unreadOnly }) }
  });

  const markReadMutation = useMarkAlertRead();

  const handleMarkRead = (id: number) => {
    markReadMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey({ unreadOnly }) });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] }); // To update badge count
      }
    });
  };

  const getAlertIcon = (type: string, priority: string) => {
    if (priority === 'critical') return <AlertTriangle className="h-6 w-6 text-destructive" />;
    
    switch(type) {
      case 'vencimento': return <Calendar className="h-6 w-6 text-amber-500" />;
      case 'faturamento': return <AlertTriangle className="h-6 w-6 text-amber-500" />;
      case 'documento': return <FileText className="h-6 w-6 text-blue-500" />;
      case 'regularizacao': return <Info className="h-6 w-6 text-primary" />;
      default: return <Bell className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch(priority) {
      case 'critical': return <Badge variant="destructive">Crítico</Badge>;
      case 'high': return <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-600">Alto</Badge>;
      case 'medium': return <Badge variant="secondary">Médio</Badge>;
      case 'low': return <Badge variant="outline">Baixo</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alertas</h1>
          <p className="text-muted-foreground mt-1">Avisos importantes sobre sua empresa.</p>
        </div>
        
        <div className="flex items-center space-x-2 bg-card p-2 rounded-lg border">
          <Switch 
            id="unread-only" 
            checked={unreadOnly} 
            onCheckedChange={setUnreadOnly} 
          />
          <Label htmlFor="unread-only">Mostrar apenas não lidos</Label>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : alerts?.length ? (
          alerts.map((alert) => (
            <Card key={alert.id} className={`transition-colors ${!alert.isRead ? 'border-l-4 border-l-primary bg-primary/5' : 'opacity-70'}`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${!alert.isRead ? 'bg-background shadow-sm' : 'bg-muted'}`}>
                    {getAlertIcon(alert.type, alert.priority)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-lg font-semibold ${!alert.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {alert.title}
                        </h3>
                        {getPriorityBadge(alert.priority)}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(alert.createdAt)}
                      </span>
                    </div>
                    
                    <p className={`text-sm ${!alert.isRead ? 'text-foreground/90' : 'text-muted-foreground'}`}>
                      {alert.description}
                    </p>
                    
                    {!alert.isRead && (
                      <div className="mt-4 flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleMarkRead(alert.id)}
                          disabled={markReadMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Marcar como lido
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-16 bg-card rounded-xl border border-dashed">
            <Bell className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-medium text-foreground">Nenhum alerta</h3>
            <p className="text-sm text-muted-foreground mt-1">Você não possui avisos no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}