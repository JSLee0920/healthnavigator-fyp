"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { SendHorizontal, Loader2, User, Bot, Menu } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { Skeleton } from "@/components/ui/skeleton";

type Message = {
  role: "user" | "ai";
  content: string;
};

type SessionData = {
  title: string;
  messages: { role: string; content: string }[];
};

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const sessionId = params.sessionId as string;

  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessionData, isPending: isLoadingSession } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const response = await api.get(`/sessions/${sessionId}/messages`, {});
      return response.data;
    },
    enabled: !!sessionId && !!isAuthenticated,
  });

  const sessionTitle = sessionData?.title || "Consultation";

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const response = await api.post("/chat/stream", {
        message: userMessage,
        session_id: sessionId,
      });
      return response.data;
    },
    onMutate: (userMessage) => {
      queryClient.setQueryData(
        ["session", sessionId],
        (old: SessionData | undefined) => ({
          ...old,
          messages: [
            ...(old?.messages ?? []),
            { role: "user", content: userMessage },
          ],
        }),
      );
    },
    onSuccess: (data) => {
      const aiReply =
        data.reply ||
        "I received your message, but the response format was unexpected.";
      queryClient.setQueryData(
        ["session", sessionId],
        (old: SessionData | undefined) => ({
          ...old,
          messages: [
            ...(old?.messages ?? []),
            { role: "ai", content: aiReply },
          ],
        }),
      );
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: () => {
      queryClient.setQueryData(
        ["session", sessionId],
        (old: SessionData | undefined) => ({
          ...old,
          messages: [
            ...(old?.messages ?? []),
            {
              role: "ai",
              content:
                "Sorry, I encountered an error trying to process your request.",
            },
          ],
        }),
      );
    },
  });

  const messages = useMemo<Message[]>(
    () =>
      (sessionData?.messages ?? []).map(
        (m: SessionData["messages"][number]) => ({
          role: m.role === "user" ? "user" : ("ai" as const),
          content: m.content,
        }),
      ),
    [sessionData?.messages],
  );

  const form = useForm({
    defaultValues: {
      message: "",
    },
    onSubmit: ({ value, formApi }) => {
      const userMessage = value.message.trim();
      if (!userMessage || chatMutation.isPending) return;

      formApi.reset();
      chatMutation.mutate(userMessage);
    },
  });

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push("/login");
    }
  }, [_hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!_hasHydrated || !isAuthenticated) return null;

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeSessionId={sessionId}
        isLoadingSessionId={isLoadingSession ? sessionId : null}
        onSessionSelect={(id) => {
          if (id !== sessionId) router.push(`/chat/${id}`);
        }}
        onNewChatClick={() => router.push("/chat")}
        onSessionDelete={(id) => {
          if (sessionId === id) router.push("/chat");
        }}
      />

      <main className="flex flex-1 flex-col relative min-w-0 bg-[radial-gradient(ellipse_at_top, var(--tw-gradient-stops))] from-primary/5 via-background to-background">
        <header className="flex h-14 shrink-0 items-center border-b border-border bg-card/80 backdrop-blur-sm px-4 sticky top-0 z-10 gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-col min-w-0 justify-center">
            {isLoadingSession ? (
              <Skeleton className="h-5 w-40" />
            ) : (
              <h1 className="text-md font-bold text-foreground truncate">
                {sessionTitle}
              </h1>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pt-12 md:pt-16 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6 flex flex-col">
            {isLoadingSession ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                    >
                      {msg.role === "user" ? (
                        <User className="h-5 w-5" />
                      ) : (
                        <Bot className="h-5 w-5" />
                      )}
                    </div>

                    <div
                      className={`rounded-2xl p-4 text-sm shadow-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-card border border-border text-card-foreground rounded-tl-none"
                      }`}
                    >
                      {msg.role === "user" ? (
                        msg.content
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-a:text-primary prose-strong:text-foreground">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {chatMutation.isPending && (
              <div className="flex w-full justify-start">
                <div className="flex gap-3 max-w-[85%] md:max-w-[75%]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="rounded-2xl rounded-tl-none bg-card border border-border p-4 text-sm shadow-sm flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Retrieving medical context...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-4 bg-transparent">
          <form
            className="w-full max-w-4xl mx-auto"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <div className="relative flex items-end w-full bg-card border border-border shadow-sm rounded-3xl p-1.5 transition-shadow focus-within:ring-1 focus-within:ring-primary/50">
              <form.Field name="message">
                {(field) => (
                  <textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    placeholder="Describe your symptoms or ask a medical question..."
                    disabled={chatMutation.isPending || isLoadingSession}
                    className="flex-1 max-h-50 min-h-11 resize-none bg-transparent py-3 pl-4 pr-2 outline-none text-sm placeholder:text-muted-foreground scrollbar-thin disabled:opacity-50"
                    rows={1}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                      field.handleChange(target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (!field.state.value.trim() || chatMutation.isPending)
                          return;
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        form.handleSubmit();
                      }
                    }}
                  />
                )}
              </form.Field>

              <form.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                  messageValue: state.values.message,
                })}
              >
                {({ canSubmit, isSubmitting, messageValue }) => (
                  <Button
                    type="submit"
                    size="icon"
                    className="mb-1 mr-1 h-9 w-9 shrink-0 rounded-full"
                    disabled={
                      !canSubmit ||
                      isSubmitting ||
                      chatMutation.isPending ||
                      !messageValue.trim()
                    }
                  >
                    {isSubmitting || chatMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <SendHorizontal className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
