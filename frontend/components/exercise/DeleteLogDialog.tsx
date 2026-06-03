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
import type { ExerciseLog } from "@/hooks/useExercise";

interface DeleteLogDialogProps {
  log: ExerciseLog | null;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: (log: ExerciseLog) => void;
}

export function DeleteLogDialog({
  log,
  isPending,
  onCancel,
  onConfirm,
}: DeleteLogDialogProps) {
  return (
    <AlertDialog
      open={!!log}
      onOpenChange={(open) => {
        if (!open && !isPending) onCancel();
      }}
    >
      <AlertDialogContent className="border-rule bg-paper">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[20px] font-semibold leading-tight tracking-tight text-primary">
            Delete exercise log
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[14px] leading-relaxed text-ink-soft">
            Are you sure you want to delete &quot;{log?.activity_type}&quot;
            {log ? ` (${log.duration_minutes} min)` : ""}? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              if (log) onConfirm(log);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
