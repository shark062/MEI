import { useState, useRef, useEffect } from "react";
import { 
  useAiChat, 
  useGetAiConversations, 
  getGetAiConversationsQueryKey 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const EXAMPLE_QUESTIONS = [
  "Estou perto do limite de faturamento?",
  "Quando vence meu próximo DAS?",
  "O que preciso para a declaração anual?",
  "Posso contratar um funcionário?"
];

export default function AiPage() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useGetAiConversations({
    query: { queryKey: getGetAiConversationsQueryKey() }
  });

  const chatMutation = useAiChat();

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatMutation.isPending]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const message = input;
    setInput("");
    
    chatMutation.mutate({ data: { message } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAiConversationsQueryKey() });
      }
    });
  };

  const handleExampleClick = (question: string) => {
    setInput(question);
    // Optional: auto-submit
    // chatMutation.mutate({ data: { message: question } }, {...})
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="h-8 w-8 text-primary" />
          Assistente IA
        </h1>
        <p className="text-muted-foreground mt-1">Tire dúvidas sobre seu MEI a qualquer momento.</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-md border-primary/20">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-3/4 rounded-2xl rounded-tl-sm" />
              <Skeleton className="h-16 w-3/4 rounded-2xl rounded-tr-sm ml-auto" />
              <Skeleton className="h-24 w-3/4 rounded-2xl rounded-tl-sm" />
            </div>
          ) : !messages?.length ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Como posso ajudar hoje?</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Posso acessar seus dados de faturamento, consultar vencimentos do DAS e responder dúvidas sobre a legislação do MEI.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mt-4">
                {EXAMPLE_QUESTIONS.map((q, i) => (
                  <Button 
                    key={i} 
                    variant="outline" 
                    className="h-auto py-3 px-4 justify-start text-left font-normal"
                    onClick={() => handleExampleClick(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div 
                    className={`px-4 py-3 rounded-2xl max-w-[80%] ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                        : 'bg-muted text-foreground rounded-tl-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {chatMutation.isPending && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Bot size={16} />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-muted rounded-tl-sm max-w-[80%]">
                    <div className="flex space-x-1 items-center h-5">
                      <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <CardFooter className="p-3 border-t bg-card mt-auto">
          <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
            <Input
              type="text"
              placeholder="Digite sua pergunta..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={chatMutation.isPending}
              className="flex-1 bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background transition-colors"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!input.trim() || chatMutation.isPending}
              className="rounded-full shrink-0"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Enviar</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}