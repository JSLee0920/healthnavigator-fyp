"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";

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

export default function DocumentsPage() {
  const router = useRouter();
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"" | DocumentStatus>("");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Reset to page 1 when filters change (render-time, matches the pattern
  // React docs recommend over a setState-in-effect).
  const [prevFilters, setPrevFilters] = useState({ debouncedSearch, statusFilter });
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

  // Clamp page during render when results shrink (e.g. after filtering).
  // React's documented pattern for "adjusting state in response to a prop
  // change" — runs only when totalPages changes, no effect needed.
  const [prevTotalPages, setPrevTotalPages] = useState(totalPages);
  if (totalPages !== prevTotalPages) {
    setPrevTotalPages(totalPages);
    if (page > totalPages) setPage(totalPages);
  }

  const onDownload = async (doc: DocumentItem) => {
    setActionError(null);
    try {
      await downloadMutation.mutateAsync({ id: doc.id, filename: doc.filename });
    } catch (e) {
      setActionError(`Download failed: ${getErrorMessage(e)}`);
    }
  };

  const onConfirmDelete = async (target: DocumentItem) => {
    setActionError(null);
    try {
      await deleteMutation.mutateAsync(target.id);
      setDeleteTarget(null);
    } catch (e) {
      setActionError(`Delete failed: ${getErrorMessage(e)}`);
    }
  };

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
          <h1 className="text-xl font-semibold">Documents</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-4">
            <DocumentsFilters
              search={searchInput}
              status={statusFilter}
              isFetching={isFetching}
              onSearchChange={setSearchInput}
              onStatusChange={setStatusFilter}
              onRefresh={() => refetch()}
            />

            {actionError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {actionError}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
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

            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <div>
                {data
                  ? `Page ${data.page} of ${totalPages} — ${data.total} document${data.total === 1 ? "" : "s"}`
                  : ""}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isFetching}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data || page >= totalPages || isFetching}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
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
