import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

export type IngestLogType = "info" | "success" | "error" | "system";

export interface IngestLogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: IngestLogType;
}

export type IngestStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "done"
  | "error";

const stamp = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const initialLog: IngestLogEntry = {
  id: 0,
  timestamp: stamp(),
  message: "System ready. Awaiting document upload.",
  type: "system",
};

export function useIngestPipeline() {
  const [logs, setLogs] = useState<IngestLogEntry[]>([initialLog]);
  const [status, setStatus] = useState<IngestStatus>("idle");
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const logIdRef = useRef(1);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  const addLog = useCallback((message: string, type: IngestLogType) => {
    setLogs((prev) => [
      ...prev,
      { id: logIdRef.current++, timestamp: stamp(), message, type },
    ]);
  }, []);

  const start = useCallback(
    async (file: File) => {
      setStatus("uploading");
      setLogs([
        {
          id: logIdRef.current++,
          timestamp: stamp(),
          message: "Initiating secure file transfer...",
          type: "system",
        },
      ]);

      try {
        const formData = new FormData();
        formData.append("file", file);
        await api.post("/admin/ingest", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        addLog(
          `File "${file.name}" uploaded successfully. Initiating processing pipeline...`,
          "success",
        );
        setStatus("processing");

        const wsBase = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(
          /^http/,
          "ws",
        );
        wsRef.current?.close();
        const ws = new WebSocket(
          `${wsBase}/admin/ws/ingest-status/${encodeURIComponent(file.name)}`,
        );
        wsRef.current = ws;

        ws.onopen = () => {
          if (wsRef.current === ws) setWsConnected(true);
        };

        ws.onmessage = (event) => {
          let data: { message: string; type: IngestLogType };
          try {
            data = JSON.parse(event.data) as {
              message: string;
              type: IngestLogType;
            };
          } catch {
            addLog("Malformed pipeline event received.", "error");
            setStatus("error");
            return;
          }
          addLog(data.message, data.type);
          if (data.type === "success" && data.message.includes("complete")) {
            setStatus("done");
          }
        };
        ws.onerror = () => {
          addLog(
            "WebSocket connection error. Pipeline stream interrupted.",
            "error",
          );
          setStatus("error");
          setWsConnected(false);
        };
        ws.onclose = () => {
          if (wsRef.current !== ws) return;
          wsRef.current = null;
          setWsConnected(false);
          addLog("Secure terminal connection closed.", "system");
          setStatus((s) => (s === "processing" ? "idle" : s));
        };
      } catch (error) {
        addLog(
          getErrorMessage(
            error,
            "An unexpected error occurred during transfer.",
          ),
          "error",
        );
        setStatus("error");
      }
    },
    [addLog],
  );

  return {
    start,
    logs,
    status,
    wsConnected,
    isPending: status === "uploading" || status === "processing",
  };
}
