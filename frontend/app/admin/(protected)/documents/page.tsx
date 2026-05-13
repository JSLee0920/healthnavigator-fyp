"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  Menu,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Sidebar from "@/components/Sidebar";
import {
  useDeleteDocument,
  useDocument,
  useDocuments,
  useDownloadDocument,
  type DocumentItem,
  type DocumentStatus,
} from "@/hooks/useAdmin";
import { useUIStore } from "@/store/uiStore";

const ALL_STATUSES = "__all__";

const STATUS_OPTIONS: { value: typeof ALL_STATUSES | DocumentStatus; label: string }[] = [
  { value: ALL_STATUSES, label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "deleting", label: "Deleting" },
];

const PAGE_SIZE = 20;

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
};

const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const getErrorMessage = (err: unknown): string => {
  if (isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  if (err instanceof Error) return err.message;
  return "Unknown error";
};

function StatusBadge({ status }: { status: DocumentStatus }) {
  const config: Record<
    DocumentStatus,
    {
      variant: "default" | "secondary" | "destructive" | "outline" | "ghost";
      className: string;
      label: string;
      spin?: boolean;
    }
  > = {
    pending: {
      variant: "outline",
      className: "text-muted-foreground",
      label: "Pending",
    },
    processing: {
      variant: "outline",
      className: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
      label: "Processing",
      spin: true,
    },
    completed: {
      variant: "outline",
      className:
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      label: "Completed",
    },
    failed: {
      variant: "destructive",
      className: "",
      label: "Failed",
    },
    deleting: {
      variant: "outline",
      className: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      label: "Deleting",
      spin: true,
    },
  };
  const c = config[status];
  return (
    <Badge variant={c.variant} className={c.className}>
      {c.spin ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {c.label}
    </Badge>
  );
}

export default function DocumentsPage() {
  const router = useRouter();
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"" | DocumentStatus>("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch((prev) => {
        const next = searchInput.trim();
        if (next !== prev) setPage(1);
        return next;
      });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isFetching, error, refetch } = useDocuments({
    page,
    pageSize: PAGE_SIZE,
    status: statusFilter,
    q: debouncedSearch,
  });

  const detailQuery = useDocument(detailId);
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

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    setActionError(null);
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteConfirmText("");
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by filename..."
                  aria-label="Search documents by filename"
                  className="pl-9"
                />
              </div>
              <Select
                value={statusFilter === "" ? ALL_STATUSES : statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v === ALL_STATUSES ? "" : (v as DocumentStatus));
                  setPage(1);
                }}
              >
                <SelectTrigger
                  aria-label="Filter documents by status"
                  className="w-[180px]"
                >
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
                className="gap-1.5"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>

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

            <div className="rounded-md border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead className="hidden md:table-cell">Uploader</TableHead>
                    <TableHead className="hidden lg:table-cell">Uploaded</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Size</TableHead>
                    <TableHead className="w-[180px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : data && data.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No documents found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.items.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="max-w-[280px] truncate font-medium" title={doc.filename}>
                          {doc.filename}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {doc.uploader_email ?? "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {formatDate(doc.uploaded_at)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={doc.status} />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {formatBytes(doc.size_bytes)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="View details"
                              onClick={() => setDetailId(doc.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Download"
                              disabled={
                                doc.status !== "completed" || downloadMutation.isPending
                              }
                              onClick={() => onDownload(doc)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete"
                              disabled={doc.status === "processing"}
                              onClick={() => {
                                setDeleteTarget(doc);
                                setDeleteConfirmText("");
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

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

      <Dialog
        open={detailId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Document details</DialogTitle>
            <DialogDescription>
              Metadata for the selected document.
            </DialogDescription>
          </DialogHeader>
          {detailQuery.isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : detailQuery.data ? (
            <dl className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Filename</dt>
              <dd className="break-all">{detailQuery.data.filename}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge status={detailQuery.data.status} />
              </dd>
              <dt className="text-muted-foreground">MIME type</dt>
              <dd>{detailQuery.data.mime_type ?? "—"}</dd>
              <dt className="text-muted-foreground">Size</dt>
              <dd>{formatBytes(detailQuery.data.size_bytes)}</dd>
              <dt className="text-muted-foreground">Uploader</dt>
              <dd>{detailQuery.data.uploader_email ?? "—"}</dd>
              <dt className="text-muted-foreground">Uploaded</dt>
              <dd>{formatDate(detailQuery.data.uploaded_at)}</dd>
              <dt className="text-muted-foreground">Completed</dt>
              <dd>{formatDate(detailQuery.data.completed_at)}</dd>
              {detailQuery.data.error_msg ? (
                <>
                  <dt className="text-muted-foreground self-start">Error</dt>
                  <dd>
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                      {detailQuery.data.error_msg}
                    </pre>
                  </dd>
                </>
              ) : null}
            </dl>
          ) : detailQuery.error ? (
            <div className="text-sm text-destructive">
              Failed to load: {getErrorMessage(detailQuery.error)}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setDeleteTarget(null);
            setDeleteConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the file, its vectors in Qdrant, and its
              Topic nodes in Neo4j. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget ? (
            <div className="space-y-2">
              <p className="text-sm">
                Retype the filename to confirm:{" "}
                <span className="font-mono text-xs">{deleteTarget.filename}</span>
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={deleteTarget.filename}
                autoFocus
              />
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                !deleteTarget ||
                deleteConfirmText !== deleteTarget.filename ||
                deleteMutation.isPending
              }
              onClick={(e) => {
                e.preventDefault();
                void onConfirmDelete();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
