"use client";

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
import type { ChatSession } from "@/hooks/useSessions";

interface DeleteSessionDialogProps {
  session: ChatSession | null;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: (session: ChatSession) => void;
}

export function DeleteSessionDialog({
  session,
  isPending,
  onCancel,
  onConfirm,
}: DeleteSessionDialogProps) {
  return (
    <AlertDialog
      open={!!session}
      onOpenChange={(open) => {
        if (!open && !isPending) onCancel();
      }}
    >
      <AlertDialogContent className="border-rule bg-paper">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[20px] font-semibold leading-tight tracking-tight text-ink">
            Delete consultation
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[14px] leading-relaxed text-ink-soft">
            Are you sure you want to delete &quot;
            {session?.title || "New Consultation"}&quot;? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              if (session) onConfirm(session);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
