"use client";

import { useEffect, useRef } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Info,
  Settings,
} from "lucide-react";

import type { IngestLogEntry, IngestLogType } from "@/hooks/useAdmin";

const renderIcon = (type: IngestLogType) => {
  switch (type) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-green-500 bg-background" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-red-500 bg-background" />;
    case "system":
      return <Settings className="h-4 w-4 text-blue-500 bg-background" />;
    default:
      return <Info className="h-4 w-4 text-muted-foreground bg-background" />;
  }
};

export function IngestionLog({ logs }: { logs: IngestLogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <aside className="flex h-[60vh] min-h-[320px] lg:h-[calc(100vh-10rem)] lg:min-h-[500px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
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
                {renderIcon(log.type)}
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
          <div ref={endRef} />
        </div>
      </div>
    </aside>
  );
}
