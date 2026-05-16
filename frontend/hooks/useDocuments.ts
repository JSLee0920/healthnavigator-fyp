import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/api";

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
