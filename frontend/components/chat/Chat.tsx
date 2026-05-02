"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "@tanstack/react-form";
import ReactMarkdown from "react-markdown";
import { SendHorizontal, Loader2, User, Bot, Menu } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

// --- CONTEXT ---
type Message = { role: "user" | "ai"; content: string };

interface ChatContextValue {
  messages: Message[];
  isPending: boolean;
  isLoadingSession?: boolean;
  sessionTitle?: string;
  showWelcome?: boolean;
  inputDisabled?: boolean;
  onSubmitMessage: (message: string) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("Chat components must be wrapped in <Chat>");
  return context;
}

// --- 1. PARENT WRAPPER ---
export function Chat({
  children,
  ...value
}: ChatContextValue & { children: React.ReactNode }) {
  return (
    <ChatContext.Provider value={value}>
      <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
        {children}
      </div>
    </ChatContext.Provider>
  );
}

// --- 2. MAIN LAYOUT ---
Chat.Main = function ChatMain({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col relative min-w-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/[0.05] via-background to-background">
      {children}
    </main>
  );
};

// --- 3. HEADER ---
Chat.Header = function ChatHeader() {
  const { sessionTitle = "New Consultation", isLoadingSession } =
    useChatContext();
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border bg-card/80 backdrop-blur-sm px-4 sticky top-0 z-10 gap-3">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0"
        onClick={() => setSidebarOpen(true)}
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
  );
};

// --- 4. MESSAGE LIST ---
Chat.MessageList = function ChatMessageList() {
  const { messages, isPending, isLoadingSession, showWelcome } =
    useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  return (
    <div className="flex-1 overflow-y-auto p-4 pt-12 md:pt-16 space-y-6">
      <div className="max-w-4xl mx-auto space-y-6 flex flex-col">
        {isLoadingSession && (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {showWelcome && !isLoadingSession && (
          <div className="flex w-full justify-start">
            <div className="flex gap-3 max-w-[85%] md:max-w-[75%]">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Bot className="h-5 w-5" />
              </div>
              <div className="rounded-2xl rounded-tl-none bg-card border border-border text-card-foreground p-4 text-sm shadow-sm">
                <ReactMarkdown>
                  Hello! I am HealthNavigator. How can I assist you with your
                  wellness today?
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {!isLoadingSession &&
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
                  className={`rounded-2xl p-4 text-sm shadow-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border border-border text-card-foreground rounded-tl-none"}`}
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

        {isPending && (
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
  );
};

// --- 5. INPUT AREA ---
Chat.InputArea = function ChatInputArea() {
  const { onSubmitMessage, isPending, isLoadingSession, inputDisabled } =
    useChatContext();
  const isDisabled = isPending || isLoadingSession || inputDisabled;

  const form = useForm({
    defaultValues: { message: "" },
    onSubmit: ({ value, formApi }) => {
      const userMessage = value.message.trim();
      if (!userMessage || isDisabled) return;
      formApi.reset();
      onSubmitMessage(userMessage);
    },
  });

  return (
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
                disabled={isDisabled}
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
                    if (!field.state.value.trim() || isDisabled) return;
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    form.handleSubmit();
                  }
                }}
              />
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) =>
              [
                state.canSubmit,
                state.isSubmitting,
                state.values.message,
              ] as const
            }
          >
            {([canSubmit, isSubmitting, messageValue]) => (
              <Button
                type="submit"
                size="icon"
                className="mb-1 mr-1 h-9 w-9 shrink-0 rounded-full"
                disabled={
                  !canSubmit ||
                  isSubmitting ||
                  isDisabled ||
                  !messageValue.trim()
                }
              >
                {isSubmitting || isPending ? (
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
  );
};
