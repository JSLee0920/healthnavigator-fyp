"use client";

import {
  ChevronDown,
  Download,
  Eye,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/admin/documents/StatusBadge";
import type { DocumentItem } from "@/hooks/useDocuments";
import { formatBytes, formatDate } from "@/lib/format";

interface DocumentsTableProps {
  items: DocumentItem[] | undefined;
  isLoading: boolean;
  isDownloadPending: boolean;
  onView: (doc: DocumentItem) => void;
  onDownload: (doc: DocumentItem) => void;
  onDelete: (doc: DocumentItem) => void;
}

const COL_GRID = "grid-cols-[2fr_1.4fr_1.2fr_0.9fr_0.7fr_120px]";

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

export function DocumentsTable({
  items,
  isLoading,
  isDownloadPending,
  onView,
  onDownload,
  onDelete,
}: DocumentsTableProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[12px] border border-rule bg-paper p-12 text-ink-mute">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="mt-3 text-[12px] font-medium uppercase tracking-[0.16em]">
          Loading documents…
        </p>
      </div>
    );
  }

  if (items && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[12px] border border-rule bg-paper p-12 text-ink-mute">
        <FileText className="mb-3 h-10 w-10 opacity-30" />
        <p className="text-[13px]">No documents found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`hidden ${COL_GRID} gap-4 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink md:grid`}
      >
        <span>Filename</span>
        <span>Uploader</span>
        <span>Uploaded</span>
        <span>Status</span>
        <span>Size</span>
        <span className="text-right">Actions</span>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-rule bg-paper">
        {items?.map((doc, i) => (
          <DocRow
            key={doc.id}
            doc={doc}
            first={i === 0}
            isDownloadPending={isDownloadPending}
            onView={onView}
            onDownload={onDownload}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

interface DocRowProps {
  doc: DocumentItem;
  first: boolean;
  isDownloadPending: boolean;
  onView: (doc: DocumentItem) => void;
  onDownload: (doc: DocumentItem) => void;
  onDelete: (doc: DocumentItem) => void;
}

function DocRow({
  doc,
  first,
  isDownloadPending,
  onView,
  onDownload,
  onDelete,
}: DocRowProps) {
  const kind = doc.filename.toLowerCase().endsWith(".xml") ? "XML" : "PDF";

  const handleRowClick = () => onView(doc);

  const dropdown = (
    <div onClick={(e) => e.stopPropagation()}>
      <ActionsDropdown
        doc={doc}
        isDownloadPending={isDownloadPending}
        onView={onView}
        onDownload={onDownload}
        onDelete={onDelete}
      />
    </div>
  );

  return (
    <>
      <div
        className={`hidden cursor-pointer ${COL_GRID} items-center gap-4 px-4 py-3.5 transition-colors hover:bg-cream-2 md:grid ${first ? "" : "border-t border-rule"}`}
        onClick={handleRowClick}
      >
        <div className="min-w-0">
          <div
            className="truncate text-[14px] font-medium text-ink"
            title={doc.filename}
          >
            {doc.filename}
          </div>
          <div className="mt-1 font-mono text-[10px] tracking-widest text-ink-mute">
            {kind}
          </div>
        </div>

        <div className="truncate font-mono text-[11px] tracking-[0.04em] text-ink-soft">
          {doc.uploader_email ?? "—"}
        </div>

        <div>
          <div className="text-[13px] text-ink">
            {formatDate(doc.uploaded_at)}
          </div>
          <div className="mt-1 font-mono text-[10px] tracking-[0.08em] text-ink-mute">
            {formatTime(doc.uploaded_at)}
          </div>
        </div>

        <div className="flex items-center">
          <StatusBadge status={doc.status} />
        </div>

        <div className="font-mono text-[12px] tracking-[0.04em] text-ink">
          {formatBytes(doc.size_bytes)}
        </div>

        <div className="flex justify-end">{dropdown}</div>
      </div>

      <div
        className={`flex cursor-pointer flex-col gap-3.5 px-4 py-4 transition-colors hover:bg-cream-2 md:hidden ${first ? "" : "border-t border-rule"}`}
        onClick={handleRowClick}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-[14px] font-medium leading-snug text-ink"
              title={doc.filename}
            >
              {doc.filename}
            </div>
            <div className="mt-1.5 font-mono text-[10px] tracking-[0.12em] text-ink-mute">
              {kind} · {formatDate(doc.uploaded_at)}
            </div>
          </div>
          {dropdown}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <StatusBadge status={doc.status} />
          <span className="font-mono text-[11px] tracking-[0.04em] text-ink-soft">
            {formatBytes(doc.size_bytes)}
          </span>
        </div>

        {doc.uploader_email && (
          <div className="truncate font-mono text-[10px] tracking-[0.04em] text-ink-mute">
            {doc.uploader_email}
          </div>
        )}
      </div>
    </>
  );
}

interface ActionsDropdownProps {
  doc: DocumentItem;
  isDownloadPending: boolean;
  onView: (doc: DocumentItem) => void;
  onDownload: (doc: DocumentItem) => void;
  onDelete: (doc: DocumentItem) => void;
}

function ActionsDropdown({
  doc,
  isDownloadPending,
  onView,
  onDownload,
  onDelete,
}: ActionsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          aria-label="Open actions menu"
          className="h-8 gap-1.5 rounded-full border-rule bg-paper px-3 text-[12px] font-medium text-ink-soft hover:bg-cream-2 hover:text-ink data-[state=open]:bg-cream-2 data-[state=open]:text-ink"
        >
          Actions
          <ChevronDown className="h-3 w-3 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w--50 rounded-[12px] border-rule bg-paper p-1.5 shadow-[0_8px_24px_-8px_oklch(0_0_0/0.16)] ring-rule/40"
      >
        <DropdownMenuItem
          onSelect={() => onView(doc)}
          className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium leading-none text-ink-soft focus:bg-sage-soft focus:text-forest-deep [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-ink-mute focus:[&>svg]:text-forest-deep"
        >
          <Eye />
          <span>View details</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={doc.status !== "completed" || isDownloadPending}
          onSelect={() => onDownload(doc)}
          className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium leading-none text-ink-soft focus:bg-sage-soft focus:text-forest-deep [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-ink-mute focus:[&>svg]:text-forest-deep"
        >
          <Download />
          <span>Download</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1 bg-rule" />
        <DropdownMenuItem
          disabled={doc.status === "processing" || doc.status === "deleting"}
          onSelect={() => onDelete(doc)}
          variant="destructive"
          className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium leading-none focus:bg-[oklch(0.94_0.05_30)] [&>svg]:h-4 [&>svg]:w-4"
        >
          <Trash2 />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
