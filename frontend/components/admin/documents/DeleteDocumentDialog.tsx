"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import type { DocumentItem } from "@/hooks/useDocuments";

interface DeleteDocumentDialogProps {
  target: DocumentItem | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (target: DocumentItem) => void;
}

export function DeleteDocumentDialog({
  target,
  isPending,
  onCancel,
  onConfirm,
}: DeleteDocumentDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  // Compare by id (not reference) so a parent re-render with a fresh-but-equal
  // target object doesn't wipe the user's input. setState-in-render is the
  // pattern React docs recommend over a setState-in-effect.
  const [prevTargetId, setPrevTargetId] = useState(target?.id ?? null);
  const targetId = target?.id ?? null;
  if (targetId !== prevTargetId) {
    setPrevTargetId(targetId);
    setConfirmText("");
  }

  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open && !isPending) onCancel();
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
        {target ? (
          <div className="space-y-2">
            <p className="text-sm">
              Retype the filename to confirm:{" "}
              <span className="font-mono text-xs">{target.filename}</span>
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={target.filename}
              autoFocus
            />
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!target || confirmText !== target.filename || isPending}
            onClick={(e) => {
              e.preventDefault();
              if (target) onConfirm(target);
            }}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending ? (
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
  );
}
