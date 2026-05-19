"use client";

import { RefreshCw, Search } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DocumentStatus } from "@/hooks/useDocuments";

const ALL_STATUSES = "__all__";

const STATUS_OPTIONS: {
  value: typeof ALL_STATUSES | DocumentStatus;
  label: string;
}[] = [
  { value: ALL_STATUSES, label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "deleting", label: "Deleting" },
];

interface DocumentsFiltersProps {
  search: string;
  status: "" | DocumentStatus;
  isFetching: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: "" | DocumentStatus) => void;
  onRefresh: () => void;
}

export function DocumentsFilters({
  search,
  status,
  isFetching,
  onSearchChange,
  onStatusChange,
  onRefresh,
}: DocumentsFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex h-13 flex-1 items-center gap-3 rounded-[14px] border border-rule bg-paper px-4 transition-colors focus-within:border-sage focus-within:bg-cream sm:h-10 sm:rounded-[10px] sm:px-3.5">
        <Search className="h-5 w-5 shrink-0 text-ink-mute sm:h-4 sm:w-4" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by filename…"
          aria-label="Search documents by filename"
          className="h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-mute sm:text-[13px]"
        />
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={status === "" ? ALL_STATUSES : status}
          onValueChange={(v) =>
            onStatusChange(v === ALL_STATUSES ? "" : (v as DocumentStatus))
          }
        >
          <SelectTrigger
            aria-label="Filter documents by status"
            className="h-10 flex-1 gap-2 rounded-full border-rule bg-paper px-4 text-[13px] text-ink-soft hover:bg-cream-2 sm:h-9 sm:w-40 sm:flex-none sm:px-3.5 sm:text-[12px]"
          >
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent
            position="popper"
            className="rounded-[10px] border-rule bg-paper"
          >
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="text-[13px]"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isFetching}
          aria-label="Refresh documents"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-rule bg-paper px-4 text-[13px] text-ink-soft transition-colors hover:bg-cream-2 disabled:opacity-50 sm:h-9 sm:px-3.5 sm:text-[12px]"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 sm:h-3 sm:w-3 ${isFetching ? "animate-spin" : ""}`}
          />
          <span className="sm:inline">Refresh</span>
        </button>
      </div>
    </div>
  );
}
