"use client";

import { Download, Eye, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export function DocumentsTable({
  items,
  isLoading,
  isDownloadPending,
  onView,
  onDownload,
  onDelete,
}: DocumentsTableProps) {
  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Filename</TableHead>
            <TableHead className="hidden md:table-cell">Uploader</TableHead>
            <TableHead className="hidden lg:table-cell">Uploaded</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Size</TableHead>
            <TableHead className="w-45 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
              </TableCell>
            </TableRow>
          ) : items && items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                No documents found.
              </TableCell>
            </TableRow>
          ) : (
            items?.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell
                  className="max-w-70 truncate font-medium"
                  title={doc.filename}
                >
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
                      onClick={() => onView(doc)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Download"
                      disabled={doc.status !== "completed" || isDownloadPending}
                      onClick={() => onDownload(doc)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      disabled={doc.status === "processing"}
                      onClick={() => onDelete(doc)}
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
  );
}
