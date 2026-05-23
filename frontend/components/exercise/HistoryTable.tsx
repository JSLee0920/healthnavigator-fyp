"use client";

import { useState } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
} from "lucide-react";

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
import {
  LOGS_PAGE_SIZE,
  useDeleteLog,
  type ExerciseLog,
} from "@/hooks/useExercise";

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
  page: number;
  total: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
}

export function HistoryTable({
  logs,
  isLoading,
  page,
  total,
  hasMore,
  onPageChange,
}: HistoryTableProps) {
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
        <p className="text-[13px]">
          {page === 0
            ? "No exercise logs yet. Add your first one above."
            : "No logs on this page."}
        </p>
        {page > 0 && (
          <Button
            variant="link"
            onClick={() => onPageChange(0)}
            className="mt-2 text-primary"
          >
            Back to page 1
          </Button>
        )}
      </div>
    );
  }

  const firstShown = page * LOGS_PAGE_SIZE + 1;
  const lastShown = page * LOGS_PAGE_SIZE + logs.length;

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2 px-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-mute md:text-[11px] md:tracking-[0.18em]">
        <span className="truncate">
          {firstShown}–{lastShown} of {total}
        </span>
        <span className="shrink-0">Page {page + 1}</span>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-rule bg-paper">
        <Table>
          <TableHeader>
            <TableRow className="border-rule hover:bg-transparent">
              <TableHead className="px-3 text-primary md:px-4">Date</TableHead>
              <TableHead className="px-3 text-primary md:px-4">Activity</TableHead>
              <TableHead className="px-3 text-primary md:px-4">Minutes</TableHead>
              <TableHead className="hidden px-3 text-primary sm:table-cell md:px-4">
                Intensity
              </TableHead>
              <TableHead className="hidden px-3 text-primary md:table-cell md:px-4">
                Calories
              </TableHead>
              <TableHead className="px-3 text-primary md:px-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow
                key={log.id}
                className="border-rule hover:bg-transparent"
              >
                <TableCell className="px-3 py-3 text-[12px] text-ink-soft md:px-4 md:text-[13px]">
                  {formatDate(log.logged_at)}
                </TableCell>
                <TableCell className="px-3 py-3 md:px-4">
                  <div className="text-[13px] font-medium text-primary md:text-[14px]">
                    {log.activity_type}
                  </div>
                  {log.notes && (
                    <div className="mt-1 text-[11px] text-ink-mute">
                      {log.notes}
                    </div>
                  )}
                  {/* Intensity badge inline on small screens (no Intensity column) */}
                  <div className="mt-1 sm:hidden">
                    <IntensityBadge intensity={log.intensity} />
                  </div>
                </TableCell>
                <TableCell className="px-3 py-3 font-mono text-[12px] tabular-nums text-primary md:px-4 md:text-[13px]">
                  {log.duration_minutes}
                </TableCell>
                <TableCell className="hidden px-3 py-3 sm:table-cell md:px-4">
                  <IntensityBadge intensity={log.intensity} />
                </TableCell>
                <TableCell className="hidden px-3 py-3 font-mono text-[13px] tabular-nums text-ink-soft md:table-cell md:px-4">
                  {log.calories ?? "—"}
                </TableCell>
                <TableCell className="px-3 py-3 md:px-4">
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

      {(page > 0 || hasMore) && (
        <div className="mt-3 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
            className="border-rule bg-transparent text-primary hover:bg-cream-2"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasMore}
            className="border-rule bg-transparent text-primary hover:bg-cream-2"
          >
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

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
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize md:px-3 md:py-1 md:text-[13px] ${
        INTENSITY_STYLES[intensity] || ""
      }`}
    >
      {intensity}
    </span>
  );
}
