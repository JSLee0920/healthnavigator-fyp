"use client";

import { useEffect, useRef } from "react";

import type { IngestLogEntry, IngestLogType } from "@/hooks/useIngestPipeline";

const toneByType: Record<
  IngestLogType,
  { kind: string; dot: string; ring: string; text: string }
> = {
  success: {
    kind: "ingest",
    dot: "var(--forest-deep)",
    ring: "var(--sage-soft)",
    text: "var(--forest-deep)",
  },
  info: {
    kind: "parse",
    dot: "oklch(0.55 0.13 250)",
    ring: "oklch(0.94 0.04 240)",
    text: "oklch(0.45 0.13 250)",
  },
  error: {
    kind: "warn",
    dot: "oklch(0.55 0.13 28)",
    ring: "oklch(0.95 0.04 30)",
    text: "oklch(0.45 0.13 28)",
  },
  system: {
    kind: "system",
    dot: "var(--ink-mute)",
    ring: "var(--cream-2)",
    text: "var(--ink-mute)",
  },
};

export function IngestionLog({
  logs,
  connected = false,
}: {
  logs: IngestLogEntry[];
  connected?: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <aside
      className="flex h-[60vh] min-h-[320px] flex-col overflow-hidden rounded-[14px] border border-rule bg-paper p-5 md:p-6 lg:h-[calc(100vh-12rem)] lg:min-h-[500px]"
    >
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${connected ? "animate-pulse" : ""}`}
            style={{
              background: connected ? "var(--forest)" : "var(--ink-mute)",
              boxShadow: connected
                ? "0 0 0 4px var(--sage-soft)"
                : "0 0 0 4px var(--cream-2)",
            }}
          />
          <h2 className="text-[17px] font-semibold leading-none tracking-tight text-ink md:text-[19px]">
            Ingestion activity
          </h2>
        </div>
        <span
          className="text-[10px] font-medium uppercase tracking-[0.18em] md:text-[11px]"
          style={{ color: connected ? "var(--forest-deep)" : "var(--ink-mute)" }}
        >
          {connected ? "Live" : "Offline"}
        </span>
      </div>

      <div
        className="flex-1 overflow-y-auto"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-atomic="false"
      >
        {logs.map((log, i) => {
          const tone = toneByType[log.type];
          return (
            <div
              key={log.id}
              className={`grid grid-cols-[16px_1fr] gap-3.5 py-3 ${i === 0 ? "" : "border-t border-rule"}`}
            >
              <span
                className="mt-1.5 ml-1 h-2 w-2 shrink-0 rounded-full"
                style={{
                  background: tone.dot,
                  boxShadow: `0 0 0 3px ${tone.ring}`,
                }}
              />
              <div className="min-w-0">
                <div className="mb-1.5 flex items-baseline gap-2">
                  <span className="font-mono text-[11px] tracking-[0.08em] text-ink-mute md:text-[12px]">
                    {log.timestamp}
                  </span>
                  <span
                    className="rounded-[3px] px-1.5 py-[2px] font-mono text-[10px] uppercase tracking-[0.18em]"
                    style={{ background: tone.ring, color: tone.text }}
                  >
                    {tone.kind}
                  </span>
                </div>
                <div className="text-[14px] leading-snug text-ink md:text-[15px]">
                  {log.message}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="mt-3.5 flex items-center justify-between border-t border-rule pt-3.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-mute md:text-[12px]">
          Showing last {logs.length} event{logs.length === 1 ? "" : "s"}
        </span>
      </div>
    </aside>
  );
}
