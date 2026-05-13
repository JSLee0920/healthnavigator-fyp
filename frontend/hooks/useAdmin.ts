import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/api";

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

const getUploadError = (error: unknown) => {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred during transfer.";
};

export function useIngestPipeline() {
  const [logs, setLogs] = useState<IngestLogEntry[]>([initialLog]);
  const [status, setStatus] = useState<IngestStatus>("idle");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  const addLog = useCallback((message: string, type: IngestLogType) => {
    setLogs((prev) => [
      ...prev,
      { id: Date.now(), timestamp: stamp(), message, type },
    ]);
  }, []);

  const start = useCallback(
    async (file: File) => {
      setStatus("uploading");
      setLogs([
        {
          id: Date.now(),
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
        };
        ws.onclose = () => {
          if (wsRef.current === ws) wsRef.current = null;
          addLog("Secure terminal connection closed.", "system");
          setStatus((s) => (s === "processing" ? "idle" : s));
        };
      } catch (error) {
        addLog(getUploadError(error), "error");
        setStatus("error");
      }
    },
    [addLog],
  );

  return {
    start,
    logs,
    status,
    isPending: status === "uploading" || status === "processing",
  };
}

// --- Document Management ---

export type DocumentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "deleting";

export interface DocumentItem {
  id: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number;
  status: DocumentStatus;
  error_msg: string | null;
  uploaded_by: string | null;
  uploader_email: string | null;
  uploaded_at: string;
  completed_at: string | null;
}

export interface DocumentListResponse {
  items: DocumentItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface DocumentsQueryParams {
  page?: number;
  pageSize?: number;
  status?: DocumentStatus | "";
  q?: string;
}

const DOCUMENTS_KEY = "admin-documents";

export function useDocuments(params: DocumentsQueryParams = {}) {
  const { page = 1, pageSize = 20, status = "", q = "" } = params;
  return useQuery({
    queryKey: [DOCUMENTS_KEY, { page, pageSize, status, q }],
    queryFn: async () => {
      const search: Record<string, string | number> = {
        page,
        page_size: pageSize,
      };
      if (status) search.status = status;
      if (q) search.q = q;
      const res = await api.get<DocumentListResponse>("/admin/documents", {
        params: search,
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useDocument(id: string | null) {
  return useQuery({
    queryKey: [DOCUMENTS_KEY, "detail", id],
    queryFn: async () => {
      const res = await api.get<DocumentItem>(`/admin/documents/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<{ status: string; filename: string }>(
        `/admin/documents/${id}`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DOCUMENTS_KEY] });
    },
  });
}

const parseFilenameFromDisposition = (
  disposition: string | undefined,
  fallback: string,
): string => {
  if (!disposition) return fallback;
  // RFC 5987: filename*=UTF-8''<urlencoded>
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      // fall through
    }
  }
  const basicMatch = disposition.match(/filename="?([^";]+)"?/i);
  return basicMatch ? basicMatch[1] : fallback;
};

export function useDownloadDocument() {
  return useMutation({
    mutationFn: async (doc: Pick<DocumentItem, "id" | "filename">) => {
      const res = await api.get<Blob>(`/admin/documents/${doc.id}/download`, {
        responseType: "blob",
      });
      const filename = parseFilenameFromDisposition(
        res.headers["content-disposition"] as string | undefined,
        doc.filename,
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return { filename };
    },
  });
}
