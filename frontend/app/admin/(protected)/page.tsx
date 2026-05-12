"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { Loader2, Menu, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import Sidebar from "@/components/Sidebar";
import { IngestionLog } from "@/components/admin/IngestionLog";
import { UploadZone } from "@/components/admin/UploadZone";
import { useIngestPipeline } from "@/hooks/useAdmin";
import { useUIStore } from "@/store/uiStore";

export default function AdminPage() {
  const router = useRouter();
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const { start, logs, isPending, status } = useIngestPipeline();

  const form = useForm({
    defaultValues: {
      file: null as File | null,
    },
    onSubmit: async ({ value }) => {
      if (!value.file) return;
      await start(value.file);
    },
  });

  useEffect(() => {
    if (status === "done") form.reset();
  }, [status, form]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        onSessionSelect={(id) => router.push(`/chat/${id}`)}
        onNewChatClick={() => router.push("/chat")}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Admin Console</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
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
                  Upload verified medical literature (.pdf) to continuously
                  train and update the Hybrid RAG architecture.
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
                    <UploadZone
                      file={field.state.value}
                      onChange={field.handleChange}
                      isPending={isPending}
                    />
                  )}
                </form.Field>

                <form.Subscribe selector={(state) => state.values.file}>
                  {(file) => (
                    <Button
                      type="submit"
                      size="lg"
                      disabled={!file || isPending}
                      className="w-full text-base font-semibold"
                    >
                      {isPending ? (
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

            <IngestionLog logs={logs} />
          </div>
        </div>
      </main>
    </div>
  );
}
