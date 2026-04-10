"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SendHorizontal,
  LogOut,
  MessageSquare,
  Loader2,
  User,
  Bot,
} from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

type Message = {
  role: "user" | "ai";
  content: string;
};

export default function ChatPage() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content:
        "Hello! I am HealthNavigator. How can I assist you with your wellness today?",
    },
  ]);
  // const [isMounted, setIsMounted] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) {
      router.push("/login");
    }
  }, [token, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

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

  if (!token) return null;

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-14 items-center border-b border-border px-4 font-bold text-lg">
          HealthNavigator
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <button className="flex w-full items-center gap-2 rounded-md bg-accent/50 p-2 text-sm text-accent-foreground hover:bg-accent transition-colors">
            <MessageSquare className="h-4 w-4" />
            <span className="truncate">Current Session</span>
          </button>
        </div>

        <div className="border-t border-border p-4">
          <div className="mb-4 truncate text-sm font-medium text-muted-foreground">
            {user?.email || "User"}
          </div>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 hover:bg-destructive hover:text-destructive-foreground transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex flex-1 flex-col relative">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
          <span className="font-bold">HealthNavigator</span>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
                    {msg.content}
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

        <div className="p-4 bg-background border-t border-border/50">
          <form
            className="flex w-full items-end gap-2 relative max-w-4xl mx-auto"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <form.Field name="message">
              {(field) => (
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Describe your symptoms or ask a medical question..."
                  className="min-h-12.5, flex-1 rounded-full pl-6 pr-12 shadow-sm bg-card border-border focus-visible:ring-primary"
                  disabled={chatMutation.isPending}
                  autoComplete="off"
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
                  className="absolute right-1.5 bottom-1.5 h-9 w-9 rounded-full shrink-0"
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
          </form>
        </div>
      </main>
    </div>
  );
}
