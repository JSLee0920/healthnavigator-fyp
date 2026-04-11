"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import {
  SendHorizontal,
  LogOut,
  MessageSquare,
  Loader2,
  User,
  Bot,
  Plus,
  Trash2,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronUp,
} from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Message = {
  role: "user" | "ai";
  content: string;
};

type ChatSession = {
  session_id: string;
  last_active: string;
  title?: string;
};

export default function ChatPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, token, logout } = useAuthStore();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content:
        "Hello! I am HealthNavigator. How can I assist you with your wellness today?",
    },
  ]);

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

  // Post user messages
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

  // Get Sessions for Chat History
  const { data: sessions, isLoading: isLoadingSessions } = useQuery<
    ChatSession[]
  >({
    queryKey: ["sessions"],
    queryFn: async () => {
      const response = await api.get("/sessions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.sessions;
    },
    enabled: !!token, // Ensure user is logged in for this fn to run
  });

  // Fetch the messages when a user select a past session
  const loadSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.get(`/sessions/${id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { id, messages: response.data.messages };
    },
    onSuccess: (data) => {
      setSessionId(data.id);
      setMessages(data.messages);
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

  // Delete Session
  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sessions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return id; // Pass the ID down to the success handler
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });

      if (sessionId === deletedId) {
        handleNewChat();
      }
    },
    onError: (error) => {
      console.error("Failed to delete session:", error);
      alert("Failed to delete the session. Please try again.");
    },
  });

  if (!token) return null;

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out md:static 
          ${isSidebarOpen ? "w-72 translate-x-0" : "-translate-x-full md:translate-x-0 md:w-16 overflow-hidden"}
        `}
      >
        {/* 1. Sidebar Header & Toggle */}
        <div
          className={`flex h-14 shrink-0 items-center border-b border-border ${isSidebarOpen ? "justify-between px-4" : "justify-center"}`}
        >
          {isSidebarOpen ? (
            <>
              <div className="flex items-center gap-2 font-bold text-lg whitespace-nowrap">
                <Image
                  src="/healthnav-logo.svg"
                  alt="HealthNavigator Logo"
                  width={64}
                  height={64}
                  className="h-16 w-16 -ml-4 -mr-2 object-contain"
                />
                HealthNavigator
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex shrink-0"
                onClick={() => setIsSidebarOpen(false)}
              >
                <PanelLeftClose className="h-5 w-5 text-muted-foreground" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={() => setIsSidebarOpen(true)}
              title="Expand Sidebar"
            >
              <PanelLeftOpen className="h-5 w-5 text-muted-foreground" />
            </Button>
          )}
        </div>

        {/* 2. Scrollable Chat List */}
        <div
          className={`flex-1 overflow-y-auto space-y-1 ${isSidebarOpen ? "p-4" : "p-2 py-4 flex flex-col items-center"}`}
        >
          <button
            onClick={handleNewChat}
            title={!isSidebarOpen ? "New Consultation" : undefined}
            className={`flex items-center rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors mb-6 whitespace-nowrap overflow-hidden shrink-0
              ${isSidebarOpen ? "w-full gap-2 p-2 text-sm" : "w-10 h-10 justify-center"}
            `}
          >
            <Plus className="h-4 w-4 shrink-0" />
            {isSidebarOpen && <span>New Consultation</span>}
          </button>

          {isSidebarOpen && (
            <>
              <div className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 whitespace-nowrap">
                Past Consultations
              </div>

              {isLoadingSessions ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : sessions?.length === 0 ? (
                <div className="px-2 text-sm text-muted-foreground/70 whitespace-nowrap">
                  No previous sessions.
                </div>
              ) : (
                sessions?.map((session) => {
                  const isSelected = sessionId === session.session_id;

                  return (
                    <div
                      key={session.session_id}
                      className={`group flex items-center transition-all w-full gap-1 rounded-xl pr-1 ${
                        isSelected
                          ? "bg-accent text-accent-foreground shadow-sm ring-1 ring-border"
                          : "hover:bg-accent/50"
                      }`}
                    >
                      <button
                        onClick={() =>
                          loadSessionMutation.mutate(session.session_id)
                        }
                        disabled={loadSessionMutation.isPending}
                        className="flex items-start text-left overflow-hidden min-w-0 flex-1 gap-3 p-3"
                      >
                        {loadSessionMutation.isPending &&
                        loadSessionMutation.variables === session.session_id ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground mt-0.5" />
                        ) : (
                          <MessageSquare
                            className={`h-4 w-4 shrink-0 mt-0.5 ${isSelected ? "text-foreground" : "text-muted-foreground"}`}
                          />
                        )}

                        <div className="flex flex-1 flex-col overflow-hidden">
                          <span
                            className={`truncate text-sm font-medium ${isSelected ? "" : "text-muted-foreground group-hover:text-foreground"}`}
                          >
                            {session.title || "New Consultation"}
                          </span>
                          <span
                            className={`mt-1 text-[10px] uppercase tracking-wider truncate ${isSelected ? "text-accent-foreground/70" : "text-muted-foreground/60"}`}
                          >
                            {new Date(session.last_active).toLocaleDateString(
                              undefined,
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                        </div>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              "Are you sure you want to delete this consultation?",
                            )
                          ) {
                            deleteSessionMutation.mutate(session.session_id);
                          }
                        }}
                        disabled={deleteSessionMutation.isPending}
                        className="p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 rounded-lg md:focus:opacity-100 shrink-0"
                      >
                        {deleteSessionMutation.isPending &&
                        deleteSessionMutation.variables ===
                          session.session_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
        {/* 3. The Dropdown User Profile Footer */}
        <div
          className={`border-t border-border shrink-0 ${isSidebarOpen ? "p-2" : "p-2 flex justify-center"}`}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                title={!isSidebarOpen ? "Account Settings" : undefined}
                className={`flex items-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary overflow-hidden ${
                  isSidebarOpen
                    ? "w-full gap-3 rounded-lg p-2 text-left hover:bg-accent"
                    : "w-10 h-10 justify-center rounded-full hover:ring-2 hover:ring-primary/50"
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  {user?.username?.[0]?.toUpperCase() ||
                    user?.email?.[0]?.toUpperCase() ||
                    "U"}
                </div>

                {isSidebarOpen && (
                  <>
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <span className="truncate text-sm font-bold text-foreground">
                        {user?.username || user?.email || "Patient User"}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        Account settings
                      </span>
                    </div>
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-64 mb-2"
              align={isSidebarOpen ? "start" : "end"}
              side="right"
            >
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

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
