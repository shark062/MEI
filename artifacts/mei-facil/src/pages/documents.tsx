import { useState } from "react";
import { 
  useListDocuments, 
  getListDocumentsQueryKey, 
  useUploadDocument, 
  useDeleteDocument 
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDate } from "@/lib/formatters";
import { Upload, Search, FileText, Trash2, Download, FileType, FileArchive, FileImage, File } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const documentSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  folder: z.string().min(1, "Pasta é obrigatória"),
  fileType: z.string().min(1, "Tipo é obrigatório"),
  fileUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  description: z.string().optional(),
});

type DocumentForm = z.infer<typeof documentSchema>;

const FOLDERS = [
  { id: 'das', label: 'Guias DAS' },
  { id: 'notas_fiscais', label: 'Notas Fiscais' },
  { id: 'declaracoes', label: 'Declarações' },
  { id: 'certidoes', label: 'Certidões' },
  { id: 'outros', label: 'Outros' },
];

export default function DocumentsPage() {
  const [activeFolder, setActiveFolder] = useState<string>('das');
  const [search, setSearch] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useListDocuments({ 
    folder: activeFolder === 'all' ? null : activeFolder,
    search: search || null
  }, {
    query: {
      queryKey: getListDocumentsQueryKey({ 
        folder: activeFolder === 'all' ? null : activeFolder, 
        search: search || null 
      })
    }
  });
  
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();

  const form = useForm<DocumentForm>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      name: "",
      folder: "das",
      fileType: "application/pdf",
      fileUrl: "https://example.com/document.pdf", // Mock URL
      description: "",
    },
  });

  const onSubmit = (data: DocumentForm) => {
    uploadMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Sucesso", description: "Documento enviado." });
        setIsUploadOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este documento?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Excluído", description: "Documento removido." });
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        }
      });
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (type.includes('image')) return <FileImage className="h-8 w-8 text-blue-500" />;
    if (type.includes('zip') || type.includes('rar')) return <FileArchive className="h-8 w-8 text-amber-500" />;
    return <File className="h-8 w-8 text-gray-500" />;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
          <p className="text-muted-foreground mt-1">Organize seus comprovantes e arquivos importantes.</p>
        </div>
        
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Novo Documento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Documento</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do arquivo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Comprovante DAS Janeiro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="folder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pasta</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a pasta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FOLDERS.map(f => (
                            <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Observações sobre o arquivo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="p-4 border-2 border-dashed rounded-lg text-center bg-muted/50">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Clique para selecionar ou arraste o arquivo</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG até 10MB</p>
                </div>
                <Button type="submit" className="w-full" disabled={uploadMutation.isPending}>
                  Fazer Upload
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar documentos..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="das" value={activeFolder} onValueChange={setActiveFolder} className="w-full">
        <TabsList className="mb-4 flex flex-wrap h-auto">
          {FOLDERS.map(f => (
            <TabsTrigger key={f.id} value={f.id} className="flex-1 sm:flex-none">
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeFolder} className="mt-0">
          <Card>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                </div>
              ) : documents?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-start gap-4 p-4 border rounded-xl bg-card hover:border-primary transition-colors group">
                      <div className="shrink-0 pt-1">
                        {getFileIcon(doc.fileType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate" title={doc.name}>{doc.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(doc.createdAt)}</p>
                        {doc.description && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">{doc.description}</p>
                        )}
                        <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="secondary" size="sm" className="h-7 text-xs flex-1" onClick={() => window.open(doc.fileUrl || '#', '_blank')}>
                            <Download className="h-3 w-3 mr-1" /> Baixar
                          </Button>
                          <Button variant="destructive" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => handleDelete(doc.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileType className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <h3 className="text-lg font-medium text-foreground">Pasta vazia</h3>
                  <p className="text-sm text-muted-foreground mt-1">Nenhum documento encontrado nesta pasta.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}