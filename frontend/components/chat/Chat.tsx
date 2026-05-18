"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "@tanstack/react-form";
import ReactMarkdown from "react-markdown";
import { SendHorizontal, Loader2, Menu } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";

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

const EMPTY_CONTEXT: ChatContextValue = {
  messages: [],
  isPending: false,
  onSubmitMessage: () => {},
};

function useChatContext() {
  return useContext(ChatContext) ?? EMPTY_CONTEXT;
}

export function Chat({
  children,
  ...value
}: ChatContextValue & { children: React.ReactNode }) {
  return (
    <ChatContext.Provider value={value}>
      <div className="flex h-screen w-full overflow-hidden bg-cream text-ink">
        {children}
      </div>
    </ChatContext.Provider>
  );
}

Chat.Main = function ChatMain({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-w-0 flex-1 flex-col bg-cream">
      {children}
    </main>
  );
};

Chat.Header = function ChatHeader() {
  const { sessionTitle = "New Consultation", isLoadingSession } =
    useChatContext();
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b border-rule bg-cream px-4 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="-ml-2 h-9 w-9 shrink-0 md:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>
      {isLoadingSession ? (
        <Skeleton className="h-6 w-48" />
      ) : (
        <h1 className="min-w-0 truncate text-[15px] font-semibold leading-none tracking-tight text-primary md:text-[17px]">
          {sessionTitle}
        </h1>
      )}
    </header>
  );
};

const WELCOME_SUGGESTIONS = [
  "Check a symptom",
  "Understand a medication",
  "Healthy lifestyle tips",
];

Chat.MessageList = function ChatMessageList() {
  const {
    messages,
    isPending,
    isLoadingSession,
    showWelcome,
    onSubmitMessage,
  } = useChatContext();
  const username = useAuthStore((s) => s.user?.username ?? "");
  const userInitial = (username[0] ?? "U").toUpperCase();
  const firstName = username.split(/[\s_]/)[0] || "there";
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    return "Good Evening";
  })();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  return (
    <div className="flex-1 overflow-y-auto p-4 pt-8 space-y-6">
      <div className="max-w-4xl mx-auto space-y-6 flex flex-col">
        {isLoadingSession && (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {showWelcome && !isLoadingSession && (
          <div className="flex w-full justify-start">
            <div className="flex max-w-[85%] gap-3 md:max-w-[75%]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-soft">
                <Image
                  src="/healthnav-logo.svg"
                  alt="HealthNavigator"
                  width={40}
                  height={40}
                  className="h-18 w-18 shrink-0 object-contain"
                />
              </div>
              <div>
                <h2 className="m-0 font-serif text-[24px] italic leading-tight text-primary md:text-[30px]">
                  {greeting}, {firstName}.
                </h2>
                <p className="mt-2.5 max-w-xl text-[14px] leading-[1.7] text-primary md:text-[15px] md:leading-[1.75]">
                  Tell me what&apos;s on your mind today — symptoms, a recent
                  test result, a worry. I&apos;ll listen first, then ask
                  follow-ups before suggesting anything.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {WELCOME_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onSubmitMessage(s)}
                      className="inline-flex h-9 items-center gap-2 rounded-full border border-rule bg-transparent px-3.5 text-[12px] text-ink transition-colors hover:bg-cream-2"
                    >
                      <span className="font-serif text-[16px] italic leading-none text-forest-deep">
                        +
                      </span>
                      {s}
                    </button>
                  ))}
                </div>
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
                className={`flex max-w-[85%] items-start gap-3 md:max-w-[75%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`flex shrink-0 items-center justify-center rounded-full ${msg.role === "user" ? "h-8 w-8 bg-forest-deep font-serif text-[15px] italic text-cream" : "h-9 w-9 bg-sage-soft"}`}
                >
                  {msg.role === "user" ? (
                    userInitial
                  ) : (
                    <Image
                      src="/healthnav-logo.svg"
                      alt="HealthNavigator"
                      width={40}
                      height={40}
                      className="h-18 w-18 shrink-0 object-contain"
                    />
                  )}
                </div>
                <div
                  className={
                    msg.role === "user"
                      ? "rounded-2xl rounded-tr-none border border-sage bg-sage-soft p-3 text-[13px] text-ink md:p-4 md:text-[15px]"
                      : "text-[14px] leading-[1.7] text-primary md:text-[15px] md:leading-[1.75]"
                  }
                >
                  {msg.role === "user" ? (
                    msg.content
                  ) : (
                    <div className="prose prose-sm max-w-none prose-headings:text-primary prose-p:my-0 prose-p:text-[14px] prose-p:leading-[1.7] prose-p:text-primary prose-strong:text-primary prose-a:text-forest-deep prose-li:text-primary md:prose-p:text-[15px] md:prose-p:leading-[1.75]">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

        {isPending && (
          <div className="flex w-full justify-start">
            <div className="flex max-w-[85%] items-start gap-3 md:max-w-[75%]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-soft">
                <Image
                  src="/healthnav-logo.svg"
                  alt="HealthNavigator"
                  width={40}
                  height={40}
                  className="h-18 w-18 shrink-0 object-contain"
                />
              </div>
              <div className="flex h-9 items-center gap-1.5 rounded-full bg-sage-soft px-4">
                <span className="h-2 w-2 animate-bounce rounded-full bg-forest-deep [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-forest-deep [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-forest-deep" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

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
    <div className="bg-cream p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:p-4 md:pb-4">
      <form
        className="mx-auto w-full max-w-4xl"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className="relative flex w-full items-center rounded-3xl border border-sage bg-paper p-1.5 transition-shadow focus-within:ring-1 focus-within:ring-forest-deep/40">
          <form.Field name="message">
            {(field) => (
              <textarea
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                placeholder="Ask a medical question…"
                disabled={isDisabled}
                className="scrollbar-thin max-h-50 min-h-11 flex-1 resize-none bg-transparent py-2.5 pl-3 pr-2 text-[15px] text-ink outline-none placeholder:text-[14px] placeholder:text-ink-mute disabled:opacity-50 md:py-3 md:pl-4"
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
                className="mr-1 h-10 w-10 shrink-0 rounded-full md:h-9 md:w-9"
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
