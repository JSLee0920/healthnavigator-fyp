"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/admin/documents/StatusBadge";
import { useDocument } from "@/hooks/useDocuments";
import { getErrorMessage } from "@/lib/errors";
import { formatBytes, formatDate } from "@/lib/format";

interface DocumentDetailDialogProps {
  documentId: string | null;
  onClose: () => void;
}

export function DocumentDetailDialog({
  documentId,
  onClose,
}: DocumentDetailDialogProps) {
  const query = useDocument(documentId);

  return (
    <Dialog
      open={documentId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Document details</DialogTitle>
          <DialogDescription>
            Metadata for the selected document.
          </DialogDescription>
        </DialogHeader>
        {query.isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : query.data ? (
          <dl className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Filename</dt>
            <dd className="break-all">{query.data.filename}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <StatusBadge status={query.data.status} />
            </dd>
            <dt className="text-muted-foreground">MIME type</dt>
            <dd>{query.data.mime_type ?? "—"}</dd>
            <dt className="text-muted-foreground">Size</dt>
            <dd>{formatBytes(query.data.size_bytes)}</dd>
            <dt className="text-muted-foreground">Uploader</dt>
            <dd>{query.data.uploader_email ?? "—"}</dd>
            <dt className="text-muted-foreground">Uploaded</dt>
            <dd>{formatDate(query.data.uploaded_at)}</dd>
            <dt className="text-muted-foreground">Completed</dt>
            <dd>{formatDate(query.data.completed_at)}</dd>
            {query.data.error_msg ? (
              <>
                <dt className="text-muted-foreground self-start">Error</dt>
                <dd>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                    {query.data.error_msg}
                  </pre>
                </dd>
              </>
            ) : null}
          </dl>
        ) : query.error ? (
          <div className="text-sm text-destructive">
            Failed to load: {getErrorMessage(query.error)}
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
