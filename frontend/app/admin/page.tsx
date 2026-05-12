"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Activity,
  Info,
  Settings,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import Sidebar from "@/components/Sidebar";
import { useAuthStore } from "@/store/authStore";

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "system";
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated, logout } = useAuthStore();

  const [isDragging, setIsDragging] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 0,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      message: "System ready. Awaiting document upload.",
      type: "system",
    },
  ]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    if (_hasHydrated && (!isAuthenticated || user?.role !== "admin")) {
      router.push("/admin/login");
    }
  }, [_hasHydrated, isAuthenticated, user, router]);

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [
      ...prev,
      {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        message,
        type,
      },
    ]);
  };

  const form = useForm({
    defaultValues: {
      file: null as File | null,
    },
    onSubmit: async ({ value, formApi }) => {
      if (!value.file) return;

      setLogs([
        {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          message: "Initiating secure file transfer...",
          type: "system",
        },
      ]);

      const formData = new FormData();
      formData.append("file", value.file);

      try {
        const response = await fetch("http://localhost:8000/admin/ingest", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || "Upload rejected by server.");
        }

        addLog(
          `File "${value.file.name}" uploaded successfully. Initiating processing pipeline...`,
          "success",
        );

        const wsUrl = `ws://localhost:8000/admin/ws/ingest-status/${encodeURIComponent(value.file.name)}`;
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          const logData = JSON.parse(event.data);
          addLog(logData.message, logData.type);

          // Clear the dropzone if the final success message arrives
          if (
            logData.type === "success" &&
            logData.message.includes("complete")
          ) {
            formApi.reset();
          }
        };

        ws.onerror = () => {
          addLog(
            "WebSocket connection error. Pipeline stream interrupted.",
            "error",
          );
        };

        ws.onclose = () => {
          addLog("Secure terminal connection closed.", "system");
        };
      } catch (error: unknown) {
        addLog(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred during transfer.",
          "error",
        );
      }
    },
  });

  const handleLogout = () => {
    logout();
    router.push("/admin/login");
  };

  const renderLogIcon = (type: string) => {
    switch (type) {
      case "success":
        return (
          <CheckCircle2 className="h-4 w-4 text-green-500 bg-background" />
        );
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500 bg-background" />;
      case "system":
        return <Settings className="h-4 w-4 text-blue-500 bg-background" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground bg-background" />;
    }
  };

  if (!_hasHydrated || !isAuthenticated || user?.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        onSessionSelect={(id) => router.push(`/chat/${id}`)}
        onNewChatClick={() => router.push("/chat")}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Admin Console</h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_400px]">
            <section className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm lg:p-8">
              <div className="mb-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-semibold">
                  Knowledge Base Ingestion
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Upload verified medical literature (.pdf, .xml) to
                  continuously train and update the Hybrid RAG architecture.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit();
                }}
                className="flex flex-1 flex-col space-y-8"
              >
                <form.Field name="file">
                  {(field) => (
                    <div
                      className={`flex min-h-[300px] flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors
                        ${isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:bg-muted/50"}
                        ${field.state.value ? "border-solid border-primary bg-primary/5" : ""}
                      `}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const droppedFile = e.dataTransfer.files?.[0];
                        if (droppedFile) field.handleChange(droppedFile);
                      }}
                      onClick={() =>
                        document.getElementById("hidden-file-input")?.click()
                      }
                    >
                      <input
                        id="hidden-file-input"
                        type="file"
                        accept=".pdf,.xml"
                        className="hidden"
                        onChange={(e) => {
                          const selectedFile = e.target.files?.[0];
                          if (selectedFile) field.handleChange(selectedFile);
                        }}
                      />

                      {field.state.value ? (
                        <div className="flex flex-col items-center space-y-4 text-center">
                          <FileText className="h-16 w-16 text-primary" />
                          <div>
                            <p className="text-lg font-medium text-foreground">
                              {field.state.value.name}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {(field.state.value.size / (1024 * 1024)).toFixed(
                                2,
                              )}{" "}
                              MB • Ready for processing
                            </p>
                          </div>
                          <Button
                            variant="link"
                            type="button"
                            className="mt-2 h-auto p-0 text-sm text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              field.handleChange(null);
                            }}
                          >
                            Remove Document
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-4 text-center text-muted-foreground">
                          <div
                            className={`rounded-full bg-background p-4 shadow-sm ${isDragging ? "animate-bounce text-primary" : ""}`}
                          >
                            <UploadCloud className="h-10 w-10" />
                          </div>
                          <div>
                            <p className="text-lg">
                              <span className="font-semibold text-primary">
                                Click to select
                              </span>{" "}
                              or drag and drop
                            </p>
                            <p className="mt-1 text-sm">
                              Supported formats: PDF, XML (Max 20MB)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </form.Field>

                <form.Subscribe
                  selector={(state) =>
                    [state.values.file, state.isSubmitting] as const
                  }
                >
                  {([file, isSubmitting]) => (
                    <Button
                      type="submit"
                      size="lg"
                      disabled={!file || isSubmitting}
                      className="w-full text-base font-semibold"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing Document...
                        </>
                      ) : (
                        "Upload & Process"
                      )}
                    </Button>
                  )}
                </form.Subscribe>
              </form>
            </section>

            <aside className="flex h-[calc(100vh-10rem)] min-h-[500px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-3 border-b border-border bg-muted/30 p-5">
                <Activity className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Ingestion Activity</h2>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="relative space-y-6 before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-background shadow-sm md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        {renderLogIcon(log.type)}
                      </div>

                      <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg border border-border bg-muted/10 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            {log.timestamp}
                          </span>
                        </div>
                        <p
                          className={`text-sm
                          ${log.type === "system" ? "font-medium text-blue-600 dark:text-blue-400" : ""}
                          ${log.type === "info" ? "text-foreground" : ""}
                          ${log.type === "success" ? "font-medium text-green-600 dark:text-green-400" : ""}
                          ${log.type === "error" ? "font-medium text-red-600 dark:text-red-400" : ""}
                        `}
                        >
                          {log.message}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
