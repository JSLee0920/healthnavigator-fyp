"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { SendHorizontal, Loader2, User, Bot, Menu } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";

type Message = {
  role: "user" | "ai";
  content: string;
};

export default function ChatPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content:
        "Hello! I am HealthNavigator. How can I assist you with your wellness today?",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasLoadedSessionRef = useRef(false);

  useEffect(() => {
    if (!token) {
      router.push("/login");
    }
  }, [token, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch the messages when a user selects a past session
  const loadSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      setLoadingSessionId(id);
      const response = await api.get(`/sessions/${id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { id, messages: response.data.messages };
    },
    onSuccess: (data) => {
      setSessionId(data.id);
      setMessages(data.messages);
      hasLoadedSessionRef.current = true;
    },
    onError: (error) => {
      console.error("Failed to load session:", error);
      setSessionId(null);
      setMessages([
        {
          role: "ai",
          content:
            "Hello! I am HealthNavigator. How can I assist you with your wellness today?",
        },
      ]);
      hasLoadedSessionRef.current = true;
    },
    onSettled: () => {
      setLoadingSessionId(null);
    },
  });

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const response = await api.post(
        "/chat/stream",
        { message: userMessage, session_id: sessionId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return response.data;
    },
    onSuccess: (data) => {
      const aiReply =
        data.reply ||
        "I received your message, but the response format was unexpected.";
      setMessages((prev) => [...prev, { role: "ai", content: aiReply }]);

      if (data.session && !sessionId) {
        setSessionId(data.session);
      }
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => {
      console.error("Chat Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content:
            "Sorry, I encountered an error trying to process your request.",
        },
      ]);
    },
  });

  const form = useForm({
    defaultValues: {
      message: "",
    },
    onSubmit: ({ value, formApi }) => {
      const userMessage = value.message.trim();

      if (!userMessage || chatMutation.isPending) return;

      formApi.reset();
      setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

      chatMutation.mutate(userMessage);
    },
  });

  const handleNewChat = () => {
    setSessionId(null);
    setMessages([
      {
        role: "ai",
        content:
          "Hello! I am HealthNavigator. How can I assist you with your wellness today?",
      },
    ]);
  };

  if (!token) return null;

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeSessionId={sessionId}
        isLoadingSessionId={loadingSessionId}
        onSessionSelect={(id) => {
          if (id !== sessionId) {
            loadSessionMutation.mutate(id);
          }
        }}
        onNewChatClick={handleNewChat}
        onSessionDelete={(id) => {
          if (sessionId === id) handleNewChat();
        }}
      />

      {/* Main Chat Area */}
      <main className="flex flex-1 flex-col relative min-w-0">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:hidden">
          <div className="flex items-center gap-2 font-bold">
            <Image
              src="/healthnav-logo.svg"
              alt="HealthNavigator Logo"
              width={64}
              height={64}
              className="h-16 w-16 -ml-4 -mr-1 object-contain"
            />
            HealthNavigator
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pt-12 md:pt-16 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6 flex flex-col">
            {messages.map((msg, idx) => (
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
            ))}

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

        <div className="p-4 bg-background">
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
                    disabled={chatMutation.isPending}
                    className="flex-1 max-h-50 min-h-11 resize-none bg-transparent py-3 pl-4 pr-2 outline-none text-sm placeholder:text-muted-foreground scrollbar-thin"
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
