"use client";

import { useState } from "react";
import { Activity, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteLogDialog } from "@/components/exercise/DeleteLogDialog";
import { useDeleteLog, type ExerciseLog } from "@/hooks/useExercise";

const INTENSITY_STYLES: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-rose-100 text-rose-800",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface HistoryTableProps {
  logs: ExerciseLog[] | undefined;
  isLoading: boolean;
}

export function HistoryTable({ logs, isLoading }: HistoryTableProps) {
  const deleteLog = useDeleteLog();
  const [logToDelete, setLogToDelete] = useState<ExerciseLog | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[12px] border border-rule bg-paper p-12 text-ink-mute">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="mt-3 text-[12px] font-medium uppercase tracking-[0.16em]">
          Loading logs…
        </p>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[12px] border border-rule bg-paper p-12 text-ink-mute">
        <Activity className="mb-3 h-10 w-10 opacity-30" />
        <p className="text-[13px]">No exercise logs yet. Add your first one above.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-[12px] border border-rule bg-paper">
        <Table>
          <TableHeader>
            <TableRow className="border-rule hover:bg-transparent">
              <TableHead className="px-4 text-primary">Date</TableHead>
              <TableHead className="px-4 text-primary">Activity</TableHead>
              <TableHead className="px-4 text-primary">Minutes</TableHead>
              <TableHead className="px-4 text-primary">Intensity</TableHead>
              <TableHead className="px-4 text-primary">Calories</TableHead>
              <TableHead className="px-4 text-primary">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow
                key={log.id}
                className="border-rule hover:bg-transparent"
              >
                <TableCell className="px-4 py-3 text-[13px] text-ink-soft">
                  {formatDate(log.logged_at)}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="text-[14px] font-medium text-primary">
                    {log.activity_type}
                  </div>
                  {log.notes && (
                    <div className="mt-1 text-[11px] text-ink-mute">
                      {log.notes}
                    </div>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3 font-mono text-[13px] tabular-nums text-primary">
                  {log.duration_minutes}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <IntensityBadge intensity={log.intensity} />
                </TableCell>
                <TableCell className="px-4 py-3 font-mono text-[13px] tabular-nums text-ink-soft">
                  {log.calories ?? "—"}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setLogToDelete(log)}
                    aria-label="Delete log"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DeleteLogDialog
        log={logToDelete}
        isPending={deleteLog.isPending}
        onCancel={() => setLogToDelete(null)}
        onConfirm={(l) =>
          deleteLog.mutate(l.id, {
            onSuccess: () => setLogToDelete(null),
          })
        }
      />
    </>
  );
}

function IntensityBadge({ intensity }: { intensity: string }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-[13px] font-semibold capitalize ${
        INTENSITY_STYLES[intensity] || ""
      }`}
    >
      {intensity}
    </span>
  );
}
