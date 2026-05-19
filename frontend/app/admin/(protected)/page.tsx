"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { Loader2, Menu, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import Sidebar from "@/components/Sidebar";
import { IngestionLog } from "@/components/admin/IngestionLog";
import { UploadZone } from "@/components/admin/UploadZone";
import { useIngestPipeline } from "@/hooks/useIngestPipeline";
import { useUIStore } from "@/store/uiStore";

const PIPELINE_STEPS = [
  { n: "01", label: "Upload" },
  { n: "02", label: "Parse" },
  { n: "03", label: "Embed" },
  { n: "04", label: "Index" },
] as const;

export default function AdminPage() {
  const router = useRouter();
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const { start, logs, isPending, status, wsConnected } = useIngestPipeline();

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

  const activeStep =
    status === "uploading"
      ? 0
      : status === "processing"
        ? 1
        : status === "done"
          ? 3
          : -1;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-cream text-ink">
      <Sidebar
        onSessionSelect={(id) => router.push(`/chat/${id}`)}
        onNewChatClick={() => router.push("/chat")}
      />

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-cream">
        <header className="flex shrink-0 flex-col gap-1 border-b border-rule bg-cream px-4 py-5 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 h-9 w-9 shrink-0 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="min-w-0 truncate text-[20px] font-semibold leading-tight tracking-tight text-ink md:text-[24px]">
              Admin <span className="text-forest-deep">Console</span>
            </h1>
          </div>
          <p className="truncate text-[13px] text-ink-soft">
            Manage the Hybrid RAG knowledge base — upload, parse, embed, index.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section className="flex flex-col gap-5 rounded-[14px] border border-rule bg-paper p-5 md:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-sage bg-sage-soft text-forest-deep">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[18px] font-semibold leading-tight tracking-tight text-ink md:text-[22px]">
                    Knowledge base ingestion
                  </h2>
                  <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-ink-soft">
                    Upload verified medical literature (.pdf) or the MedlinePlus
                    health-topics XML to continuously train and update the
                    Hybrid RAG architecture.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 rounded-[10px] border border-rule bg-cream-2 p-3">
                {PIPELINE_STEPS.map((s, i) => {
                  const isActive = i === activeStep;
                  const isDone = i < activeStep || status === "done";
                  const highlight = isActive || isDone;
                  return (
                    <div key={s.n} className="flex flex-col gap-1 px-1">
                      <div className="text-[9px] font-medium uppercase tracking-[0.18em] text-ink-mute">
                        {s.n}
                      </div>
                      <div
                        className={`text-[11px] font-medium md:text-[12px] ${highlight ? "text-forest-deep" : "text-ink-soft"}`}
                      >
                        {s.label}
                      </div>
                      <div
                        className={`h-[2px] rounded-full ${highlight ? "bg-forest-deep" : "bg-rule"}`}
                      />
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit();
                }}
                className="flex flex-1 flex-col gap-4"
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
                      disabled={!file || isPending}
                      className="h-12 w-full gap-2 rounded-[10px] bg-forest-deep text-[14px] font-medium text-cream hover:bg-forest disabled:opacity-50"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing document…
                        </>
                      ) : (
                        "Upload & Process"
                      )}
                    </Button>
                  )}
                </form.Subscribe>
              </form>
            </section>

            <IngestionLog logs={logs} connected={wsConnected} />
          </div>
        </div>
      </main>
    </div>
  );
}
