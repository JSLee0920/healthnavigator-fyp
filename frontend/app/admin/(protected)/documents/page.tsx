"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import Sidebar from "@/components/Sidebar";
import { DeleteDocumentDialog } from "@/components/admin/documents/DeleteDocumentDialog";
import { DocumentDetailDialog } from "@/components/admin/documents/DocumentDetailDialog";
import { DocumentsFilters } from "@/components/admin/documents/DocumentsFilters";
import { DocumentsTable } from "@/components/admin/documents/DocumentsTable";
import {
  useDeleteDocument,
  useDocuments,
  useDownloadDocument,
  type DocumentItem,
  type DocumentStatus,
} from "@/hooks/useDocuments";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { getErrorMessage } from "@/lib/errors";
import { useUIStore } from "@/store/uiStore";

const PAGE_SIZE = 20;

const pad = (n: number) => n.toString().padStart(2, "0");

export default function DocumentsPage() {
  const router = useRouter();
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"" | DocumentStatus>("");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);

  const [prevFilters, setPrevFilters] = useState({
    debouncedSearch,
    statusFilter,
  });
  if (
    prevFilters.debouncedSearch !== debouncedSearch ||
    prevFilters.statusFilter !== statusFilter
  ) {
    setPrevFilters({ debouncedSearch, statusFilter });
    setPage(1);
  }

  const { data, isLoading, isFetching, error, refetch } = useDocuments({
    page,
    pageSize: PAGE_SIZE,
    status: statusFilter,
    q: debouncedSearch,
  });

  const deleteMutation = useDeleteDocument();
  const downloadMutation = useDownloadDocument();

  const totalPages = useMemo(
    () => (data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1),
    [data],
  );

  const [prevTotalPages, setPrevTotalPages] = useState(totalPages);
  if (totalPages !== prevTotalPages) {
    setPrevTotalPages(totalPages);
    if (page > totalPages) setPage(totalPages);
  }

  const onDownload = async (doc: DocumentItem) => {
    try {
      await downloadMutation.mutateAsync({
        id: doc.id,
        filename: doc.filename,
      });
    } catch (e) {
      toast.error(`Download Failed: ${getErrorMessage(e)}`);
    }
  };

  const onConfirmDelete = async (target: DocumentItem) => {
    try {
      await deleteMutation.mutateAsync(target.id);
      setDeleteTarget(null);
      toast.success("Document Deleted");
    } catch (e) {
      toast.error(`Delete Failed: ${getErrorMessage(e)}`);
    }
  };

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
              <span className="text-forest-deep">Documents</span>
            </h1>
          </div>
          <p className="truncate text-[13px] text-ink-soft">
            Sources that power the assistant. Inspect, or remove any file.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 md:gap-4">
            <DocumentsFilters
              search={searchInput}
              status={statusFilter}
              isFetching={isFetching}
              onSearchChange={setSearchInput}
              onStatusChange={setStatusFilter}
              onRefresh={() => refetch()}
            />

            {error ? (
              <div className="rounded-[10px] border border-[oklch(0.82_0.1_25)] bg-[oklch(0.94_0.05_30)] px-3 py-2 text-[13px] text-[oklch(0.45_0.13_28)]">
                Failed to load documents: {getErrorMessage(error)}
              </div>
            ) : null}

            <DocumentsTable
              items={data?.items}
              isLoading={isLoading}
              isDownloadPending={downloadMutation.isPending}
              onView={(doc) => setDetailId(doc.id)}
              onDownload={onDownload}
              onDelete={setDeleteTarget}
            />

            {data && (
              <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute md:text-[11px]">
                  Page {pad(data.page)} of {pad(totalPages)} · {data.total}{" "}
                  document{data.total === 1 ? "" : "s"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || isFetching}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-rule bg-paper px-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute transition-colors hover:bg-cream-2 disabled:opacity-40 sm:h-8 sm:px-3.5"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!data || page >= totalPages || isFetching}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-rule bg-paper px-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute transition-colors hover:bg-cream-2 disabled:opacity-40 sm:h-8 sm:px-3.5"
                  >
                    Next
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <DocumentDetailDialog
        documentId={detailId}
        onClose={() => setDetailId(null)}
      />

      <DeleteDocumentDialog
        target={deleteTarget}
        isPending={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
